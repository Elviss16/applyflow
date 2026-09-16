import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { db } from "./prisma/db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const JWT_SECRET = process.env.JWT_SECRET ?? "";

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is missing from the .env file"
  );
}

app.use(cors());
app.use(express.json());

type TokenPayload = {
  userId: number;
};

/* AUTH MIDDLEWARE */

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorization =
    req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = authorization.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as TokenPayload;

    res.locals.userId = decoded.userId;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

/* ROOT */

app.get("/", (_req, res) => {
  res.json({
    message: "ApplyFlow API is running",
  });
});

/* REGISTER */

app.post(
  "/auth/register",
  async (req, res) => {
    try {
      const { name, email, password } =
        req.body;

      if (
        !name?.trim() ||
        !email?.trim() ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Name, email, and password are required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters",
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const existingUser =
        await db.orm.public.User.first({
          email: normalizedEmail,
        });

      if (existingUser) {
        return res.status(409).json({
          message:
            "An account with that email already exists",
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await db.orm.public.User.create({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
        });

      const token = jwt.sign(
        {
          userId: user.id,
        },
        JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create account",
      });
    }
  }
);

/* LOGIN */

app.post(
  "/auth/login",
  async (req, res) => {
    try {
      const { email, password } =
        req.body;

      if (
        !email?.trim() ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Email and password are required",
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const user =
        await db.orm.public.User.first({
          email: normalizedEmail,
        });

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const passwordMatches =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!passwordMatches) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
        },
        JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        message: "Failed to log in",
      });
    }
  }
);

/* CURRENT USER */

app.get(
  "/auth/me",
  requireAuth,
  async (_req, res) => {
    try {
      const userId =
        res.locals.userId as number;

      const user =
        await db.orm.public.User.first({
          id: userId,
        });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    } catch (error) {
      console.error(
        "AUTH ME ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load user",
      });
    }
  }
);

/* GET APPLICATIONS */

app.get(
  "/applications",
  requireAuth,
  async (_req, res) => {
    try {
      const userId =
        res.locals.userId as number;

      const applications =
        await db.orm.public.Application
          .where({
            userId,
          })
          .all();

      res.json(applications);
    } catch (error) {
      console.error(
        "GET APPLICATIONS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch applications",
      });
    }
  }
);

/* CREATE APPLICATION */

app.post(
  "/applications",
  requireAuth,
  async (req, res) => {
    try {
      const userId =
        res.locals.userId as number;

      const {
        company,
        role,
        location,
        status,
      } = req.body;

      if (
        !company?.trim() ||
        !role?.trim() ||
        !status
      ) {
        return res.status(400).json({
          message:
            "Company, role, and status are required",
        });
      }

      const validStatuses = [
        "Saved",
        "Applied",
        "Interview",
        "Offer",
      ];

      if (
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      const application =
        await db.orm.public.Application.create(
          {
            company: company.trim(),
            role: role.trim(),
            location:
              location?.trim() ||
              "Location not specified",
            status,
            userId,
          }
        );

      res.status(201).json(
        application
      );
    } catch (error) {
      console.error(
        "CREATE APPLICATION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create application",
      });
    }
  }
);

/* UPDATE APPLICATION */

app.put(
  "/applications/:id",
  requireAuth,
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      );

      const userId =
        res.locals.userId as number;

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message:
            "Invalid application ID",
        });
      }

      const {
        company,
        role,
        location,
        status,
      } = req.body;

      const application =
        await db.orm.public.Application
          .where({
            id,
            userId,
          })
          .update({
            company,
            role,
            location,
            status,
          });

      if (!application) {
        return res.status(404).json({
          message:
            "Application not found",
        });
      }

      res.json(application);
    } catch (error) {
      console.error(
        "UPDATE APPLICATION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update application",
      });
    }
  }
);

/* DELETE APPLICATION */

app.delete(
  "/applications/:id",
  requireAuth,
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      );

      const userId =
        res.locals.userId as number;

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message:
            "Invalid application ID",
        });
      }

      const application =
        await db.orm.public.Application
          .where({
            id,
            userId,
          })
          .delete();

      if (!application) {
        return res.status(404).json({
          message:
            "Application not found",
        });
      }

      res.json({
        message:
          "Application deleted",
      });
    } catch (error) {
      console.error(
        "DELETE APPLICATION ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete application",
      });
    }
  }
);

/* START SERVER */

app.listen(PORT, () => {
  console.log(
    `ApplyFlow API running on http://localhost:${PORT}`
  );
});