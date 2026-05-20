import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { SYSTEM_ROLES } from "@sms/shared";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { id: "demo-school" },
    update: {},
    create: {
      id: "demo-school",
      name: "Demo International School",
      schoolType: "K12"
    }
  });

  for (const roleName of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName }
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "SUPER_ADMIN" }
  });

  const passwordHash = await bcrypt.hash(process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? "ChangeMe123!", 12);

  await prisma.user.upsert({
    where: { email: process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? "admin@demo-school.local" },
    update: {},
    create: {
      schoolId: school.id,
      roleId: superAdminRole.id,
      email: process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? "admin@demo-school.local",
      fullName: "System Administrator",
      passwordHash,
      emailVerified: true
    }
  });

  const student = await prisma.student.upsert({
    where: {
      schoolId_admissionNo: {
        schoolId: school.id,
        admissionNo: "ADM-0001"
      }
    },
    update: {},
    create: {
      schoolId: school.id,
      admissionNo: "ADM-0001",
      firstName: "Amina",
      lastName: "Kamau",
      email: "amina.kamau@demo-school.local",
      dateOfBirth: new Date("2012-05-12")
    }
  });

  // Skip invoice seeding as it requires line items and proper structure
  // await prisma.studentInvoice.upsert({...});
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
