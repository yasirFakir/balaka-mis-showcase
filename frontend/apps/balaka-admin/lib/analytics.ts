import { fetchClient } from "@/core/api";
import { format } from "date-fns";

export interface ServiceStat {
    service_id: number;
    name: string;
    revenue: number;
    profit: number;
    request_count: number;
    category?: string;
    pending_count: number;
    processing_count: number;
    completed_count: number;
    staff_in_charge: string[];
    is_active: boolean;
    is_public: boolean;
    is_available: boolean;
    pending_weight?: number;
    pending_cartons?: number;
    completed_weight?: number;
}

export interface AnalyticsSummary {
    total_revenue: number;
    total_cost: number;
    net_profit: number;
    total_debt: number;
    total_requests_count?: number;
    pending_requests_count: number;
    approved_requests_count: number;
    processing_requests_count: number;
    completed_requests_count: number;
    pending_verifications_count: number;
    revenue_trend: { date: string; revenue: number; cost: number; profit: number }[];
    revenue_by_service: { name: string; value: number }[];
    debt_by_vendor: { name: string; value: number }[];
    service_stats: ServiceStat[];
}

export async function getAnalyticsSummary(
    startDate?: Date | null, 
    endDate?: Date | null,
    staffId?: number | null,
    serviceId?: number | null,
    category?: string | null,
    isPublic?: boolean | null
): Promise<AnalyticsSummary> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"));
    if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"));
    if (staffId) params.append("staff_id", staffId.toString());
    if (serviceId) params.append("service_id", serviceId.toString());
    if (category) params.append("category", category);
    if (isPublic !== undefined && isPublic !== null) params.append("is_public", isPublic.toString());

    const queryString = params.toString() ? `?${params.toString()}` : "";
    return fetchClient<AnalyticsSummary>(`/api/v1/analytics/summary${queryString}`);
}
