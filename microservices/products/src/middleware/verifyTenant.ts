import { Request, Response, NextFunction } from "express";
import axios from 'axios';


export const verifyTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).send({ message: "Invalid token" });
    }

    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return res.status(500).send({ message: "Server Tenant ID not found" });
    }
    const tenantPayload = await axios.get(`${process.env.TENANT_MS_URL}/tenant/${SERVER_TENANT_ID}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (tenantPayload.status !== 200) {
      return res.status(500).send({ message: "Server Tenant not found" });
    }

    const user = req.body.user;

    // Check for tenant ownership
    if (user.id !== tenantPayload.data.tenants.owner_id) {
      return res.status(403).send({ message: "Not Authorized User" });
    }

    next();
  } catch (error) {
    return res.status(401).send({ message: "Invalid token" });
  }
};