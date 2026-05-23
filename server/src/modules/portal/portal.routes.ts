import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const portalRoutes = Router();

const querySchema = z.object({
  studentId: z.string().optional()
});

const studentPhotoSchema = z.object({
  fileName: z.string().min(2),
  fileType: z.literal("image/png"),
  fileData: z.string().regex(/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/, "Photo must be a PNG data URL")
});

const listQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});

const messageSchema = z.object({
  title: z.string().min(2),
  message: z.string().min(2),
  audience: z.string().default("ALL")
});

const assignmentSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  attachment: z.object({
    fileName: z.string().min(2),
    fileType: z.enum([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]),
    fileData: z.string().min(12)
  }).optional()
});

const maxStudentPhotoBytes = 2 * 1024 * 1024;

const getBase64Bytes = (base64DataUrl: string) => {
  const normalized = base64DataUrl.split(",").pop() ?? "";
  return Buffer.byteLength(normalized, "base64");
};

const proofOfPaymentSchema = z.object({
  fileName: z.string().min(2),
  fileType: z.literal("application/pdf"),
  fileData: z.string().regex(/^data:application\/pdf;base64,[a-zA-Z0-9+/=]+$/, "POP must be a PDF data URL"),
  notes: z.string().max(500).optional()
});

const maxProofPayloadBytes = 2 * 1024 * 1024;
const maxAssignmentAttachmentBytes = 3 * 1024 * 1024;

const getDataBytes = (base64Data: string) => {
  const normalized = base64Data.includes(",") ? base64Data.split(",").pop() ?? "" : base64Data;
  return Buffer.byteLength(normalized, "base64");
};

portalRoutes.get("/summary", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const [attendanceEntries, reportCards, feeStatements, timetable, announcements] = await Promise.all([
      prisma.attendanceRecord.count({ where: { schoolId } }),
      prisma.examResult.count({ where: { student: { schoolId } } }),
      prisma.studentInvoice.count({ where: { schoolId } }),
      prisma.timetableEntry.count({ where: { schoolId } }),
      prisma.notification.count({ where: { schoolId, channel: "ANNOUNCEMENT" } })
    ]);

    res.json({
      attendanceEntries,
      reportCards,
      feeStatements,
      assignments: 0,
      timetable,
      announcements,
      messaging: true
    });
  } catch (error) {
    next(error);
  }
});

portalRoutes.get("/students", authenticate, async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      where: { schoolId: req.auth!.schoolId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        admissionNo: true,
        firstName: true,
        lastName: true
      }
    });
    res.json(students);
  } catch (error) {
    next(error);
  }
});

portalRoutes.get("/student-profiles", authenticate, async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const schoolId = req.auth!.schoolId;

    const profiles = await prisma.student.findMany({
      where: {
        schoolId,
        ...(query.studentId ? { id: query.studentId } : {})
      },
      include: {
        classRoom: {
          select: {
            name: true,
            gradeLevel: true,
            stream: true
          }
        },
        guardians: {
          include: {
            guardian: {
              select: {
                fullName: true,
                phone: true,
                relationship: true
              }
            }
          }
        }
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 100
    });

    res.json(
      profiles.map((student) => ({
        id: student.id,
        studentCode: student.studentCode,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        className: student.classRoom?.name ?? null,
        gradeLevel: student.classRoom?.gradeLevel ?? null,
        stream: student.classRoom?.stream ?? null,
        profilePhotoUrl: student.profilePhotoUrl,
        parentName: student.guardians[0]?.guardian.fullName ?? null,
        parentPhone: student.guardians[0]?.guardian.phone ?? null,
        parentRelationship: student.guardians[0]?.guardian.relationship ?? null,
        enrolledAt: student.enrolledAt
      }))
    );
  } catch (error) {
    next(error);
  }
});

portalRoutes.post("/students/:id/photo", authenticate, async (req, res, next) => {
  try {
    const payload = studentPhotoSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!studentId) {
      return res.status(400).json({ error: "Invalid student id" });
    }

    const bytes = getBase64Bytes(payload.fileData);
    if (bytes > maxStudentPhotoBytes) {
      return res.status(400).json({ error: "PNG photo is too large. Maximum size is 2MB." });
    }

    const existingStudent = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true } });
    if (!existingStudent) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { profilePhotoUrl: payload.fileData },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePhotoUrl: true
      }
    });

    res.json({
      message: "Student photo uploaded successfully.",
      student: updatedStudent
    });
  } catch (error) {
    next(error);
  }
});

portalRoutes.get("/report-cards", authenticate, async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const where = query.studentId
      ? { student: { schoolId: req.auth!.schoolId }, studentId: query.studentId }
      : { student: { schoolId: req.auth!.schoolId } };

    const reportCards = await prisma.examResult.findMany({
      where,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNo: true }
        },
        exam: {
          include: {
            subject: {
              select: { code: true, name: true }
            }
          }
        }
      },
      orderBy: { exam: { examDate: "desc" } },
      take: 200
    });

    res.json(reportCards);
  } catch (error) {
    next(error);
  }
});

portalRoutes.get("/fee-statements", authenticate, async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const where = query.studentId ? { schoolId: req.auth!.schoolId, studentId: query.studentId } : { schoolId: req.auth!.schoolId };

    const statements = await prisma.studentInvoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      take: 200
    });
    res.json(statements);
  } catch (error) {
    next(error);
  }
});

portalRoutes.post("/fee-statements/:invoiceId/pop", authenticate, async (req, res, next) => {
  try {
    const payload = proofOfPaymentSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const invoiceId = typeof req.params.invoiceId === "string" ? req.params.invoiceId : undefined;

    if (!invoiceId) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await prisma.studentInvoice.findFirst({
      where: { id: invoiceId, schoolId },
      select: {
        id: true,
        studentId: true,
        invoiceNo: true,
        outstandingAmount: true,
        netAmount: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Fee statement not found" });
    }

    const dataBytes = getDataBytes(payload.fileData);
    if (dataBytes > maxProofPayloadBytes) {
      return res.status(400).json({ error: "POP file is too large. Max allowed size is 2MB." });
    }

    const submission = await prisma.workflowInstance.create({
      data: {
        schoolId,
        workflowKey: "payment-proof",
        title: `POP ${invoice.invoiceNo}`,
        status: "PENDING",
        currentStep: "pending_accounts_verification",
        historyJson: [
          {
            action: "submitted",
            by: req.auth!.email,
            at: new Date().toISOString(),
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            invoiceNo: invoice.invoiceNo,
            outstandingAmount: invoice.outstandingAmount.toString(),
            invoiceAmount: invoice.netAmount.toString(),
            fileName: payload.fileName,
            fileType: payload.fileType,
            fileData: payload.fileData,
            notes: payload.notes ?? null,
            verificationStatus: "PENDING",
            verificationBy: null,
            verificationAt: null,
            verificationRemarks: null
          }
        ]
      }
    });

    res.status(201).json({
      id: submission.id,
      message: "Proof of payment uploaded successfully. Pending accounts verification.",
      status: submission.status
    });
  } catch (error) {
    next(error);
  }
});

portalRoutes.get("/fee-statements/pop-submissions", authenticate, async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const schoolId = req.auth!.schoolId;

    const submissions = await prisma.workflowInstance.findMany({
      where: {
        schoolId,
        workflowKey: "payment-proof"
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const normalized = submissions.map((submission) => {
      const history = Array.isArray(submission.historyJson) ? submission.historyJson as Array<Record<string, unknown>> : [];
      const firstEntry = history[0] ?? {};
      const latestEntry = history[history.length - 1] ?? firstEntry;

      return {
        id: submission.id,
        title: submission.title,
        status: submission.status,
        currentStep: submission.currentStep,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        invoiceId: typeof firstEntry.invoiceId === "string" ? firstEntry.invoiceId : null,
        studentId: typeof firstEntry.studentId === "string" ? firstEntry.studentId : null,
        invoiceNo: typeof firstEntry.invoiceNo === "string" ? firstEntry.invoiceNo : null,
        fileName: typeof firstEntry.fileName === "string" ? firstEntry.fileName : null,
        fileType: typeof firstEntry.fileType === "string" ? firstEntry.fileType : null,
        submittedBy: typeof firstEntry.by === "string" ? firstEntry.by : null,
        verificationStatus: typeof latestEntry.verificationStatus === "string" ? latestEntry.verificationStatus : "PENDING",
        verificationBy: typeof latestEntry.verificationBy === "string" ? latestEntry.verificationBy : null,
        verificationAt: typeof latestEntry.verificationAt === "string" ? latestEntry.verificationAt : null,
        verificationRemarks: typeof latestEntry.verificationRemarks === "string" ? latestEntry.verificationRemarks : null
      };
    }).filter((item) => {
      const byStudent = query.studentId ? item.studentId === query.studentId : true;
      return byStudent;
    });

    res.json(normalized);
  } catch (error) {
    next(error);
  }
});

const feeStatementApprovalSchema = z.object({
  fileName: z.string().min(2),
  fileType: z.enum(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  fileData: z.string().min(12),
  notes: z.string().max(500).optional()
});

const assignmentSubmissionSchema = z.object({
  fileName: z.string().min(2),
  fileType: z.enum(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  fileData: z.string().min(12),
  notes: z.string().max(500).optional()
});

const verifyPopSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().max(500).optional()
});

portalRoutes.post("/fee-statements/:invoiceId/approval-upload", authenticate, async (req, res, next) => {
  try {
    const payload = feeStatementApprovalSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const invoiceId = typeof req.params.invoiceId === "string" ? req.params.invoiceId : undefined;

    if (!invoiceId) {
      return res.status(400).json({ error: "Invalid invoice id" });
    }

    const invoice = await prisma.studentInvoice.findFirst({
      where: { id: invoiceId, schoolId },
      select: {
        id: true,
        studentId: true,
        invoiceNo: true,
        totalAmount: true,
        netAmount: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Fee statement not found" });
    }

    const dataBytes = getDataBytes(payload.fileData);
    if (dataBytes > maxProofPayloadBytes) {
      return res.status(400).json({ error: "File is too large. Max allowed size is 2MB." });
    }

    const submission = await prisma.workflowInstance.create({
      data: {
        schoolId,
        workflowKey: "fee-statement-approval",
        title: `Fee Statement Approval ${invoice.invoiceNo}`,
        status: "PENDING",
        currentStep: "pending_accounts_approval",
        historyJson: [
          {
            action: "submitted",
            by: req.auth!.email,
            at: new Date().toISOString(),
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            invoiceNo: invoice.invoiceNo,
            totalAmount: invoice.totalAmount.toString(),
            netAmount: invoice.netAmount.toString(),
            fileName: payload.fileName,
            fileType: payload.fileType,
            fileData: payload.fileData,
            notes: payload.notes ?? null,
            approvalStatus: "PENDING",
            approvalBy: null,
            approvalAt: null,
            approvalRemarks: null
          }
        ]
      }
    });

    res.status(201).json({
      id: submission.id,
      message: "Fee statement approval document uploaded successfully. Pending accounts verification.",
      status: submission.status
    });
  } catch (error) {
    next(error);
  }
});

portalRoutes.post(
  "/fee-statements/pop-submissions/:id/verify",
  authenticate,
  authorize(["ACCOUNTANT", "SUPER_ADMIN", "SCHOOL_ADMIN"]),
  async (req, res, next) => {
    try {
      const payload = verifyPopSchema.parse(req.body);
      const schoolId = req.auth!.schoolId;
      const submissionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!submissionId) {
        return res.status(400).json({ error: "Invalid POP submission id" });
      }

      const existing = await prisma.workflowInstance.findFirst({
        where: {
          id: submissionId,
          schoolId,
          workflowKey: "payment-proof"
        }
      });

      if (!existing) {
        return res.status(404).json({ error: "POP submission not found" });
      }

      const previousHistory = Array.isArray(existing.historyJson)
        ? existing.historyJson as Array<Record<string, unknown>>
        : [];

      const nextHistory = [
        ...previousHistory,
        {
          action: "verified",
          by: req.auth!.email,
          at: new Date().toISOString(),
          verificationStatus: payload.decision,
          verificationBy: req.auth!.email,
          verificationAt: new Date().toISOString(),
          verificationRemarks: payload.remarks ?? null
        }
      ];

      const verified = await prisma.workflowInstance.update({
        where: { id: existing.id },
        data: {
          status: payload.decision,
          currentStep: payload.decision === "APPROVED" ? "verified_by_accounts" : "rejected_by_accounts",
          historyJson: nextHistory as Prisma.InputJsonValue
        }
      });

      res.json({
        id: verified.id,
        status: verified.status,
        currentStep: verified.currentStep,
        message: payload.decision === "APPROVED" ? "POP approved by accounts." : "POP rejected by accounts."
      });
    } catch (error) {
      next(error);
    }
  }
);

portalRoutes.get("/messages", authenticate, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const messages = await prisma.notification.findMany({
      where: {
        schoolId: req.auth!.schoolId,
        channel: { in: ["IN_APP", "ANNOUNCEMENT"] },
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" } },
                { message: { contains: query.q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { sentAt: "desc" },
      skip: query.offset,
      take: query.limit
    });
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

portalRoutes.post("/messages", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "REGISTRAR"]), async (req, res, next) => {
  try {
    const payload = messageSchema.parse(req.body);
    const message = await prisma.notification.create({
      data: {
        schoolId: req.auth!.schoolId,
        senderId: req.auth!.userId,
        title: payload.title,
        message: payload.message,
        audience: payload.audience,
        channel: "IN_APP"
      }
    });
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

portalRoutes.get("/assignments", authenticate, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const assignments = await prisma.workflowInstance.findMany({
      where: {
        schoolId: req.auth!.schoolId,
        workflowKey: "assignment",
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" } },
                { currentStep: { contains: query.q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" },
      skip: query.offset,
      take: query.limit
    });
    const mappedAssignments = assignments.map((assignment) => {
      const history = Array.isArray(assignment.historyJson) ? assignment.historyJson as Array<Record<string, unknown>> : [];
      const firstEntry = history[0] ?? {};
      const attachment = (firstEntry.attachment && typeof firstEntry.attachment === "object")
        ? firstEntry.attachment as Record<string, unknown>
        : null;

      return {
        ...assignment,
        attachment: attachment
          ? {
              fileName: typeof attachment.fileName === "string" ? attachment.fileName : null,
              fileType: typeof attachment.fileType === "string" ? attachment.fileType : null,
              fileData: typeof attachment.fileData === "string" ? attachment.fileData : null
            }
          : null
      };
    });

    res.json(mappedAssignments);
  } catch (error) {
    next(error);
  }
});

portalRoutes.post("/assignments", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER", "REGISTRAR"]), async (req, res, next) => {
  try {
    const payload = assignmentSchema.parse(req.body);

    if (payload.attachment) {
      const attachmentBytes = getDataBytes(payload.attachment.fileData);
      if (attachmentBytes > maxAssignmentAttachmentBytes) {
        return res.status(400).json({ error: "Attachment is too large. Maximum size is 3MB." });
      }
    }

    const assignment = await prisma.workflowInstance.create({
      data: {
        schoolId: req.auth!.schoolId,
        workflowKey: "assignment",
        title: payload.title,
        currentStep: "published",
        historyJson: [
          {
            action: "created",
            description: payload.description,
            by: req.auth!.email,
            at: new Date().toISOString(),
            attachment: payload.attachment
              ? {
                  fileName: payload.attachment.fileName,
                  fileType: payload.attachment.fileType,
                  fileData: payload.attachment.fileData
                }
              : null
          }
        ]
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

portalRoutes.post("/fee-statements/approval-submissions/:id/verify", authenticate, authorize(["ACCOUNTANT", "SUPER_ADMIN", "SCHOOL_ADMIN"]), async (req, res, next) => {
  try {
    const payload = verifyPopSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const submissionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!submissionId) {
      return res.status(400).json({ error: "Invalid submission id" });
    }

    const existing = await prisma.workflowInstance.findFirst({
      where: {
        id: submissionId,
        schoolId,
        workflowKey: "fee-statement-approval"
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Fee statement approval submission not found" });
    }

    const previousHistory = Array.isArray(existing.historyJson)
      ? existing.historyJson as Array<Record<string, unknown>>
      : [];

    const nextHistory = [
      ...previousHistory,
      {
        action: "verified",
        by: req.auth!.email,
        at: new Date().toISOString(),
        approvalStatus: payload.decision,
        approvalBy: req.auth!.email,
        approvalAt: new Date().toISOString(),
        approvalRemarks: payload.remarks ?? null
      }
    ];

    const verified = await prisma.workflowInstance.update({
      where: { id: existing.id },
      data: {
        status: payload.decision,
        currentStep: payload.decision === "APPROVED" ? "approved_by_accounts" : "rejected_by_accounts",
        historyJson: nextHistory as Prisma.InputJsonValue
      }
    });

    res.json({
      id: verified.id,
      status: verified.status,
      currentStep: verified.currentStep,
      message: payload.decision === "APPROVED" ? "Fee statement approval approved by accounts." : "Fee statement approval rejected by accounts."
    });
  } catch (error) {
    next(error);
  }
});

portalRoutes.post("/assignments/:assignmentId/submit", authenticate, async (req, res, next) => {
  try {
    const payload = assignmentSubmissionSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const assignmentId = typeof req.params.assignmentId === "string" ? req.params.assignmentId : undefined;

    if (!assignmentId) {
      return res.status(400).json({ error: "Invalid assignment id" });
    }

    const assignment = await prisma.workflowInstance.findFirst({
      where: { id: assignmentId, schoolId, workflowKey: "assignment" },
      select: { id: true, title: true }
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const dataBytes = getDataBytes(payload.fileData);
    if (dataBytes > maxAssignmentAttachmentBytes) {
      return res.status(400).json({ error: "Submission file is too large. Max allowed size is 3MB." });
    }

    const submission = await prisma.workflowInstance.create({
      data: {
        schoolId,
        workflowKey: "assignment-submission",
        title: `Submission: ${assignment.title}`,
        status: "PENDING",
        currentStep: "pending_teacher_review",
        historyJson: [
          {
            action: "submitted",
            by: req.auth!.email,
            at: new Date().toISOString(),
            assignmentId: assignment.id,
            fileName: payload.fileName,
            fileType: payload.fileType,
            fileData: payload.fileData,
            notes: payload.notes ?? null,
            reviewStatus: "PENDING",
            reviewBy: null,
            reviewAt: null,
            reviewRemarks: null,
            reviewGrade: null
          }
        ]
      }
    });

    res.status(201).json({
      id: submission.id,
      message: "Assignment submitted successfully. Pending teacher review.",
      status: submission.status
    });
  } catch (error) {
    next(error);
  }
});

portalRoutes.get("/assignment-submissions", authenticate, async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const schoolId = req.auth!.schoolId;

    const submissions = await prisma.workflowInstance.findMany({
      where: {
        schoolId,
        workflowKey: "assignment-submission"
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    const normalized = submissions.map((submission) => {
      const history = Array.isArray(submission.historyJson) ? submission.historyJson as Array<Record<string, unknown>> : [];
      const firstEntry = history[0] ?? {};
      const latestEntry = history[history.length - 1] ?? firstEntry;

      return {
        id: submission.id,
        title: submission.title,
        status: submission.status,
        currentStep: submission.currentStep,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        assignmentId: typeof firstEntry.assignmentId === "string" ? firstEntry.assignmentId : null,
        fileName: typeof firstEntry.fileName === "string" ? firstEntry.fileName : null,
        fileType: typeof firstEntry.fileType === "string" ? firstEntry.fileType : null,
        submittedBy: typeof firstEntry.by === "string" ? firstEntry.by : null,
        notes: typeof firstEntry.notes === "string" ? firstEntry.notes : null,
        reviewStatus: typeof latestEntry.reviewStatus === "string" ? latestEntry.reviewStatus : "PENDING",
        reviewBy: typeof latestEntry.reviewBy === "string" ? latestEntry.reviewBy : null,
        reviewAt: typeof latestEntry.reviewAt === "string" ? latestEntry.reviewAt : null,
        reviewRemarks: typeof latestEntry.reviewRemarks === "string" ? latestEntry.reviewRemarks : null,
        reviewGrade: typeof latestEntry.reviewGrade === "string" ? latestEntry.reviewGrade : null
      };
    });

    res.json(normalized);
  } catch (error) {
    next(error);
  }
});

portalRoutes.post("/assignment-submissions/:id/review", authenticate, authorize(["TEACHER", "SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"]), async (req, res, next) => {
  try {
    const reviewSchema = z.object({
      decision: z.enum(["APPROVED", "REJECTED"]),
      grade: z.string().optional(),
      remarks: z.string().max(500).optional()
    });

    const payload = reviewSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const submissionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!submissionId) {
      return res.status(400).json({ error: "Invalid submission id" });
    }

    const existing = await prisma.workflowInstance.findFirst({
      where: {
        id: submissionId,
        schoolId,
        workflowKey: "assignment-submission"
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Assignment submission not found" });
    }

    const previousHistory = Array.isArray(existing.historyJson)
      ? existing.historyJson as Array<Record<string, unknown>>
      : [];

    const nextHistory = [
      ...previousHistory,
      {
        action: "reviewed",
        by: req.auth!.email,
        at: new Date().toISOString(),
        reviewStatus: payload.decision,
        reviewBy: req.auth!.email,
        reviewAt: new Date().toISOString(),
        reviewRemarks: payload.remarks ?? null,
        reviewGrade: payload.grade ?? null
      }
    ];

    const reviewed = await prisma.workflowInstance.update({
      where: { id: existing.id },
      data: {
        status: payload.decision,
        currentStep: payload.decision === "APPROVED" ? "approved_by_teacher" : "rejected_by_teacher",
        historyJson: nextHistory as Prisma.InputJsonValue
      }
    });

    res.json({
      id: reviewed.id,
      status: reviewed.status,
      currentStep: reviewed.currentStep,
      message: payload.decision === "APPROVED" ? "Assignment approved by teacher." : "Assignment rejected by teacher."
    });
  } catch (error) {
    next(error);
  }
});
