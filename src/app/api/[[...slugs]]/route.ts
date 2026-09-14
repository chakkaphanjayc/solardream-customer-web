import { createNextRouteHandlers } from "@/server/elysia/next-route";
import { customerApiApp } from "@/server/elysia/customer-app";

export const maxDuration = 300;

const handlers = createNextRouteHandlers(customerApiApp, "customer");

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
