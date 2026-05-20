import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma/client.js";
import { authenticate, authorize } from "../../middleware/auth.js";

const createStudentSchema = z.object({
  admissionNo: z.string().min(3).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  nationalId: z.string().min(5).optional(),
  dateOfBirth: z.string().datetime(),
  gender: z.enum(["MALE", "FEMALE"]),
  address: z.string().min(5).optional(),
  phone: z.string().min(7).optional(),
  parentName: z.string().min(2).optional(),
  parentPhone: z.string().min(7).optional()
});

const listStudentQuerySchema = z.object({
  q: z.string().trim().min(1).optional()
});

const updateStudentSchema = z.object({
  admissionNo: z.string().min(3).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  nationalId: z.string().min(5).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  address: z.string().min(5).optional(),
  phone: z.string().min(7).optional(),
  parentName: z.string().min(2).optional(),
  parentPhone: z.string().min(7).optional(),
  parentRemove: z.boolean().optional(),
  parentReplace: z.boolean().optional()
});

export const studentsRoutes = Router();

async function generateStudentCode(schoolId: string) {
  const total = await prisma.student.count({ where: { schoolId } });
  const nextNumber = String(total + 1).padStart(5, "0");
  const year = new Date().getFullYear();
  return `STU-${year}-${nextNumber}`;
}

studentsRoutes.get("/", authenticate, async (req, res, next) => {
  try {
    const query = listStudentQuerySchema.parse(req.query);
    const students = await prisma.student.findMany({
      where: {
        schoolId: req.auth!.schoolId,
        ...(query.q
          ? {
              OR: [
                { firstName: { contains: query.q, mode: "insensitive" } },
                { lastName: { contains: query.q, mode: "insensitive" } },
                { admissionNo: { contains: query.q, mode: "insensitive" } },
                { nationalId: { contains: query.q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        guardians: {
          include: {
            guardian: {
              select: {
                fullName: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { enrolledAt: "desc" },
      take: 100
    });

    res.json(
      students.map((student) => ({
        ...student,
        parentName: student.guardians[0]?.guardian.fullName ?? null,
        parentPhone: student.guardians[0]?.guardian.phone ?? null
      }))
    );
  } catch (error) {
    next(error);
  }
});

studentsRoutes.post("/", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"]), async (req, res, next) => {
  try {
    const payload = createStudentSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const generatedStudentCode = await generateStudentCode(schoolId);
    const admissionNo = payload.admissionNo ?? generatedStudentCode;

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          schoolId,
          studentCode: generatedStudentCode,
          admissionNo,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          nationalId: payload.nationalId,
          dateOfBirth: new Date(payload.dateOfBirth),
          gender: payload.gender,
          address: payload.address,
          phone: payload.phone
        }
      });

      if (payload.parentName && payload.parentPhone) {
        const guardian = await tx.guardian.create({
          data: {
            schoolId,
            fullName: payload.parentName,
            phone: payload.parentPhone,
            relationship: "PARENT"
          }
        });

        await tx.studentGuardian.create({
          data: {
            studentId: createdStudent.id,
            guardianId: guardian.id
          }
        });
      }

      return tx.student.findUniqueOrThrow({
        where: { id: createdStudent.id },
        include: {
          guardians: {
            include: {
              guardian: {
                select: {
                  fullName: true,
                  phone: true
                }
              }
            }
          }
        }
      });
    });

    res.status(201).json({
      ...student,
      parentName: student.guardians[0]?.guardian.fullName ?? null,
      parentPhone: student.guardians[0]?.guardian.phone ?? null
    });
  } catch (error) {
    next(error);
  }
});

studentsRoutes.put("/:id", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"]), async (req, res, next) => {
  try {
    const payload = updateStudentSchema.parse(req.body);
    const schoolId = req.auth!.schoolId;
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!studentId) {
      res.status(400).json({ message: "Student id is required" });
      return;
    }

    const existing = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        guardians: {
          include: {
            guardian: true
          }
        }
      }
    });

    if (!existing || existing.schoolId !== schoolId) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const student = await prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id: existing.id },
        data: {
          admissionNo: payload.admissionNo,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          nationalId: payload.nationalId,
          dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
          gender: payload.gender,
          address: payload.address,
          phone: payload.phone
        }
      });

      const existingGuardianLink = existing.guardians[0];

      if (payload.parentRemove && existingGuardianLink) {
        await tx.studentGuardian.delete({ where: { id: existingGuardianLink.id } });
        const linksCount = await tx.studentGuardian.count({ where: { guardianId: existingGuardianLink.guardianId } });
        if (linksCount === 0) {
          await tx.guardian.delete({ where: { id: existingGuardianLink.guardianId } });
        }
      }

      if (payload.parentReplace && payload.parentName && payload.parentPhone) {
        if (existingGuardianLink) {
          await tx.studentGuardian.delete({ where: { id: existingGuardianLink.id } });
          const linksCount = await tx.studentGuardian.count({ where: { guardianId: existingGuardianLink.guardianId } });
          if (linksCount === 0) {
            await tx.guardian.delete({ where: { id: existingGuardianLink.guardianId } });
          }
        }

        const newGuardian = await tx.guardian.create({
          data: {
            schoolId,
            fullName: payload.parentName,
            phone: payload.parentPhone,
            relationship: "PARENT"
          }
        });
        await tx.studentGuardian.create({
          data: {
            studentId: updatedStudent.id,
            guardianId: newGuardian.id
          }
        });
      } else if (payload.parentName && payload.parentPhone && !payload.parentRemove) {
        if (existingGuardianLink?.guardianId) {
          await tx.guardian.update({
            where: { id: existingGuardianLink.guardianId },
            data: {
              fullName: payload.parentName,
              phone: payload.parentPhone,
              relationship: "PARENT"
            }
          });
        } else {
          const guardian = await tx.guardian.create({
            data: {
              schoolId,
              fullName: payload.parentName,
              phone: payload.parentPhone,
              relationship: "PARENT"
            }
          });
          await tx.studentGuardian.create({
            data: {
              studentId: updatedStudent.id,
              guardianId: guardian.id
            }
          });
        }
      }

      return tx.student.findUniqueOrThrow({
        where: { id: updatedStudent.id },
        include: {
          guardians: {
            include: {
              guardian: {
                select: {
                  fullName: true,
                  phone: true
                }
              }
            }
          }
        }
      });
    });

    res.json({
      ...student,
      parentName: student.guardians[0]?.guardian.fullName ?? null,
      parentPhone: student.guardians[0]?.guardian.phone ?? null
    });
  } catch (error) {
    next(error);
  }
});

studentsRoutes.delete("/:id", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "REGISTRAR"]), async (req, res, next) => {
  try {
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!studentId) {
      res.status(400).json({ message: "Student id is required" });
      return;
    }

    const existing = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        guardians: true
      }
    });

    if (!existing || existing.schoolId !== req.auth!.schoolId) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.deleteMany({ where: { studentId: existing.id } });
      await tx.examResult.deleteMany({ where: { studentId: existing.id } });
      await tx.hostelAssignment.deleteMany({ where: { studentId: existing.id } });
      await tx.studentTransport.deleteMany({ where: { studentId: existing.id } });

      const links = await tx.studentGuardian.findMany({ where: { studentId: existing.id } });
      await tx.studentGuardian.deleteMany({ where: { studentId: existing.id } });

      for (const link of links) {
        const remaining = await tx.studentGuardian.count({ where: { guardianId: link.guardianId } });
        if (remaining === 0) {
          await tx.guardian.delete({ where: { id: link.guardianId } });
        }
      }

      await tx.student.delete({ where: { id: existing.id } });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
