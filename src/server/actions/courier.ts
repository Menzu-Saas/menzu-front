"use server";
import type { CourierCommand, CourierDashboard } from "@/lib/courier";
import type { ActionResult } from "./orders";
import { BETA_UNAVAILABLE } from "@/lib/beta-unavailable";
export async function selectCourierStoreAction(_form: FormData): Promise<void> { throw new Error(BETA_UNAVAILABLE); }
export async function getCourierDashboardAction(_rid: string): Promise<ActionResult<CourierDashboard>> { return {ok:false,error:BETA_UNAVAILABLE,code:"BETA_UNAVAILABLE"}; }
export async function courierCommandAction(_rid: string, _command: CourierCommand): Promise<ActionResult<CourierDashboard>> { return {ok:false,error:BETA_UNAVAILABLE,code:"BETA_UNAVAILABLE"}; }
