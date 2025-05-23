import { Request, Response } from "express";
import * as Service from "./services";

type PaginatedReq = Request<{}, any, any, any, { page: number; limit: number }>;

export const getAllOrdersHandler = async (req: PaginatedReq, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const { user } = req.body;
  const response = await Service.getAllOrdersService(user, page, limit);
  return res.status(response.status).send(response.data);
};

export const getOrderDetailHandler = async (req: Request, res: Response) => {
  const { user } = req.body;
  const { orderId } = req.params;
  const response = await Service.getOrderDetailService(user, orderId);
  return res.status(response.status).send(response.data);
};

export const placeOrderHandler = async (req: Request, res: Response) => {
  const { user } = req.body;
  const { shipping_provider } = req.body;
  const response = await Service.placeOrderService(user, shipping_provider);
  return res.status(response.status).send(response.data);
};

export const payOrderHandler = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { payment_method, payment_reference, amount } = req.body;
  const response = await Service.payOrderService(
    orderId,
    payment_method,
    payment_reference,
    amount
  );
  return res.status(response.status).send(response.data);
};

export const cancelOrderHandler = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { user } = req.body;
  const response = await Service.cancelOrderService(user, orderId);
  return res.status(response.status).send(response.data);
};
