import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { prisma } from "../../prisma/client.js";

export const classroomsRoutes = Router();

const classroomSchema = z.object({
  name: z.string().min(2),
  stream: z.string().optional(),
  gradeLevel: z.string().min(1),
  managerRole: z.enum(["HEADMASTER", "DEPUTY"]),
  classTeacherName: z.string().min(2)
});

const classroomUpdateSchema = classroomSchema.partial();

const assignStudentSchema = z.object({
  studentId: z.string().min(1)
});

const attendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"])
});

const attendanceFilterSchema = z.object({
  date: z.string().datetime().optional()
});

const flagAbsencesSchema = z.object({
  date: z.string().datetime()
});

classroomsRoutes.get("/", authenticate, async (req, res, next) => {
  try {
    const schoolId = req.auth!.schoolId;
    const classrooms = await prisma.classRoom.findMany({
      where: { schoolId },
      include: {
        students: {
          select: {
            id: true,
            admissionNo: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
    });
    res.json(classrooms);
  } catch (error) {
    next(error);
  }
});

classroomsRoutes.post("/", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"]), async (req, res, next) => {
  try {
    const payload = classroomSchema.parse(req.body);
    const classroom = await prisma.classRoom.create({
      data: {
        schoolId: req.auth!.schoolId,
        name: payload.name,
        stream: payload.stream,
        gradeLevel: payload.gradeLevel,
        managerRole: payload.managerRole,
        classTeacherName: payload.classTeacherName
      }
    });
    res.status(201).json(classroom);
  } catch (error) {
    next(error);
  }
});

classroomsRoutes.put("/:id", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"]), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ message: "Classroom id is required" });
      return;
    }

    const payload = classroomUpdateSchema.parse(req.body);
    const existing = await prisma.classRoom.findUnique({ where: { id } });
    if (!existing || existing.schoolId !== req.auth!.schoolId) {
      res.status(404).json({ message: "Classroom not found" });
      return;
    }

    const classroom = await prisma.classRoom.update({
      where: { id },
      data: payload
    });
    res.json(classroom);
  } catch (error) {
    next(error);
  }
});

classroomsRoutes.post("/:id/students", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"]), async (req, res, next) => {
  try {
    const classroomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!classroomId) {
      res.status(400).json({ message: "Classroom id is required" });
      return;
    }

    const payload = assignStudentSchema.parse(req.body);
    const classroom = await prisma.classRoom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.schoolId !== req.auth!.schoolId) {
      res.status(404).json({ message: "Classroom not found" });
      return;
    }

    const student = await prisma.student.update({
      where: { id: payload.studentId },
      data: { classRoomId: classroom.id }
    });

    res.json(student);
  } catch (error) {
    next(error);
  }
});

classroomsRoutes.delete("/:id/students/:studentId", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"]), async (req, res, next) => {
  try {
    const classroomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;

    if (!classroomId || !studentId) {
      res.status(400).json({ message: "Classroom id and student id are required" });
      return;
    }

    const classroom = await prisma.classRoom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.schoolId !== req.auth!.schoolId) {
      res.status(404).json({ message: "Classroom not found" });
      return;
    }

    await prisma.student.update({
      where: { id: studentId },
      data: { classRoomId: null }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

classroomsRoutes.post("/:id/attendance", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"]), async (req, res, next) => {
  try {
    const classroomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!classroomId) {
      res.status(400).json({ message: "Classroom id is required" });
      return;
    }

    const payload = attendanceSchema.parse(req.body);
    const classroom = await prisma.classRoom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.schoolId !== req.auth!.schoolId) {
      res.status(404).json({ message: "Classroom not found" });
      return;
    }

    const attendance = await prisma.attendanceRecord.upsert({
      where: {
        studentId_date: {
          studentId: payload.studentId,
          date: new Date(payload.date)
        }
      },
      create: {
        schoolId: req.auth!.schoolId,
        studentId: payload.studentId,
        date: new Date(payload.date),
        status: payload.status
      },
      update: {
        status: payload.status
      }
    });

    res.status(201).json(attendance);
  } catch (error) {
    next(error);
  }
});

classroomsRoutes.get("/:id/attendance", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"]), async (req, res, next) => {
  try {
    const classroomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!classroomId) {
      res.status(400).json({ message: "Classroom id is required" });
      return;
    }

    const query = attendanceFilterSchema.parse(req.query);
    const classroom = await prisma.classRoom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.schoolId !== req.auth!.schoolId) {
      res.status(404).json({ message: "Classroom not found" });
      return;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        schoolId: req.auth!.schoolId,
        student: { classRoomId: classroomId },
        ...(query.date ? { date: new Date(query.date) } : {})
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNo: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [{ date: "desc" }]
    });

    res.json(records);
  } catch (error) {
    next(error);
  }
});

classroomsRoutes.post("/:id/attendance/flag-absent", authenticate, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL", "TEACHER"]), async (req, res, next) => {
  try {
    const classroomId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!classroomId) {
      res.status(400).json({ message: "Classroom id is required" });
      return;
    }

    const payload = flagAbsencesSchema.parse(req.body);
    const classroom = await prisma.classRoom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.schoolId !== req.auth!.schoolId) {
      res.status(404).json({ message: "Classroom not found" });
      return;
    }

    const absences = await prisma.attendanceRecord.findMany({
      where: {
        schoolId: req.auth!.schoolId,
        student: { classRoomId: classroomId },
        date: new Date(payload.date),
        status: "ABSENT"
      },
      include: {
        student: {
          select: {
            admissionNo: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (absences.length === 0) {
      res.json({ flagged: 0 });
      return;
    }

    await prisma.notification.createMany({
      data: absences.map((item) => ({
        schoolId: req.auth!.schoolId,
        senderId: req.auth!.userId,
        title: `Absence Flag: ${item.student.admissionNo}`,
        message: `${item.student.firstName} ${item.student.lastName} was absent on ${new Date(payload.date).toLocaleDateString()}.`,
        channel: "IN_APP",
        audience: "STAFF"
      }))
    });

    res.json({ flagged: absences.length });
  } catch (error) {
    next(error);
  }
});
