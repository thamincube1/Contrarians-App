import type { StaffRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: StaffRole;
    staffId: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: StaffRole;
      staffId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: StaffRole;
    staffId: string;
  }
}
