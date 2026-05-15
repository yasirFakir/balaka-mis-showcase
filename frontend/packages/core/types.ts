import { FormSchema } from "../ui/lib/form-types";

/**
 * Shared Type Definitions for Balaka MIS
 */

export interface Permission {
    id: number;
    name: string;
    slug: string;
    description?: string;
    module?: string;
}

export interface Role {
    id: number;
    name: string;
    description?: string;
    permissions: Permission[];
}

export interface User {
    id: number;
    email: string;
    full_name: string;
    phone_number?: string;
    profile_picture?: string;
    date_of_birth?: string;
    gender?: string;
    nationality?: string;
    nid_number?: string;
    passport_number?: string;
    passport_expiry?: string;
    visa_number?: string;
    visa_expiry?: string;
    iqama_number?: string;
    iqama_expiry?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    is_active: boolean;
    is_superuser: boolean;
    must_change_password?: boolean;
    roles: Role[];
    allowed_services?: { id: number; name: string }[];
    allowed_service_ids?: number[];
    staff_category?: string;
    work_office?: string;
}

export interface FinancialSchemaItem {
    key: string;
    label: string;
    type: 'INCOME' | 'EXPENSE' | 'DISCOUNT';
    source: 'CLIENT' | 'EXTERNAL' | 'INTERNAL';
    amount: number;
    sub_items?: { label: string; amount: number }[];
}

export interface ServiceVariant {
    id: number;
    name: string;
    name_en?: string;
    name_bn?: string;
    description?: string;
    default_price: number;
    default_cost?: number;
    default_vendor_id?: number;
    service_def_id: number;
    price_model?: 'FIXED' | 'PER_UNIT';
}

export interface VendorSummary {
    id: number;
    name: string;
    type: 'EXTERNAL' | 'INTERNAL';
    current_balance: number;
}

export interface ServiceDefinition {
    id: number;
    name: string;
    name_bn?: string;
    slug: string;
    description?: string;
    description_bn?: string;
    base_price: number;
    form_schema?: FormSchema;
    financial_schema?: FinancialSchemaItem[];
    is_active?: boolean;
    is_public?: boolean;
    is_available?: boolean;
    category?: string;
    tags?: string[];
    image_url?: string;
    variants?: ServiceVariant[];
    assigned_staff?: User[];
    vendors?: VendorSummary[];
    coupon_config?: {
        enabled: boolean;
        code: string;
        percentage: number;
        expiry_date?: string;
    };
}

export interface StatusHistory {
    id: number;
    service_request_id: number;
    old_status: string;
    new_status: string;
    changed_at: string;
    created_at?: string; // Compatibility alias
    changed_by_id: number;
    changed_by?: User;
}

export interface Transaction {
    id: number;
    transaction_id: string;
    service_request_id?: number;
    user_id: number;
    amount: number;
    base_price: number;
    discount: number;
    status: 'Pending' | 'Verified' | 'Flagged';
    payment_method: string;
    client_reference_id?: string;
    internal_reference_id?: string;
    claimed_amount?: number;
    claimed_currency?: string;
    exchange_rate: number;
    verified_at?: string;
    verified_by_id?: number;
    verified_by?: User;
    created_at: string;
    created_by_id: number;
    created_by?: User;
    updated_at?: string;
    updated_by_id?: number;
    updated_by?: User;
    notes?: string;
    user?: User;
    service_request?: ServiceRequest;
}

export interface ServiceRequest {
    id: number;
    readable_id?: string;
    user_id: number;
    service_def_id: number;
    status: string;
    form_data: Record<string, any>;
    selling_price: number;
    cost_price: number;
    profit: number;
    paid_amount?: number;
    balance_due?: number;
    financial_breakdown?: FinancialItem[];
    quantity: number;
    created_at: string;
    created_by_id?: number;
    created_by?: User;
    updated_at: string;
    updated_by_id?: number;
    updated_by?: User;
    service_definition?: ServiceDefinition;
    user?: User;
    status_history?: StatusHistory[];
    variant_id?: number;
    variant?: ServiceVariant;
    vendor_id?: number;
    currency?: string;
    exchange_rate?: number;
    coupon_code?: string;
    rejection_reason?: string;
}

export interface FinancialItem {
    label: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE' | 'DISCOUNT' | 'PAYMENT';
    source: 'CLIENT' | 'EXTERNAL' | 'INTERNAL';
    source_id?: string | number;
    id?: string | number;
    vendor_id?: string | number;
    sub_items?: { label: string; amount: number }[];
    key?: string;
}

export interface Vendor {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    type: 'EXTERNAL' | 'INTERNAL';
    current_balance: number;
    created_at: string;
    transactions?: VendorTransaction[];
}

export interface VendorTransaction {
    id: number;
    transaction_id: string;
    vendor_id: number;
    amount: number;
    transaction_type: 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT';
    reference_id?: string;
    currency?: string;
    claimed_amount?: number;
    exchange_rate?: number;
    proof_url?: string;
    notes?: string;
    created_at: string;
    created_by_id: number;
    created_by?: User;
    vendor?: Vendor;
}

export interface TransactionSummary {
    verified_total: number;
    pending_total: number;
    refund_total: number;
}

export interface TransactionListResponse {
    items: Transaction[];
    summary: TransactionSummary;
}

export interface VendorTransactionSummary {
    total_purchase: number;
    total_payment: number;
    net_liability: number;
}

export interface VendorTransactionListResponse {
    items: VendorTransaction[];
    summary: VendorTransactionSummary;
}

export interface AnalyticsSummary {
    total_revenue: number;
    total_cost: number;
    net_profit: number;
    total_debt: number;
    total_requests_count: number;
    pending_requests_count: number;
    approved_requests_count: number;
    processing_requests_count: number;
    pending_verifications_count: number;
    revenue_trend: { date: string; revenue: number; cost: number; profit: number }[];
    revenue_by_service: { name: string; value: number }[];
    debt_by_vendor: { name: string; value: number }[];
}

export interface UnifiedTransaction {
    id: string;
    date: string;
    type: 'INCOME' | 'EXPENSE' | 'LIABILITY';
    category: string;
    reference: string;
    external_reference?: string;
    amount: number;
    status: string;
    claimed_amount?: number;
    claimed_currency?: string;
    currency?: string;
    exchange_rate?: number;
    payment_method?: string;
    proof_url?: string;
    actor_name?: string;
    notes?: string;
    service_request_id?: number;
    user_id?: number;
}

export interface TicketMessage {
    id: number;
    ticket_id: number;
    sender_id: number;
    message: string;
    created_at: string;
    sender?: User;
    attachments?: string[] | null;
}

export interface SupportTicket {
    id: number;
    user_id: number;
    service_request_id?: number;
    subject: string;
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    category: string;
    created_at: string;
    updated_at: string;
    created_by_id?: number;
    created_by?: User;
    updated_by_id?: number;
    updated_by?: User;
    user?: User;
    service_request?: ServiceRequest;
    messages?: TicketMessage[];
}

export interface CategoryRevenue {
    category: string;
    revenue: number;
}

export interface StaffPerformance {
    staff_id: number;
    full_name: string;
    staff_category: string;
    work_office: string;
    revenue_generated: number;
    category_breakdown: CategoryRevenue[];
    operation_count: number;
    travel_ticket_costs: number;
    fixed_costs: number;
    net_profit: number;
}

export interface CategorizedReport {
    month: string;
    year: string;
    internal_affairs_pnl: number;
    external_affairs_pnl: number;
    staff_performance: StaffPerformance[];
    global_stats: {
        total_requests: number;
        net_revenue: number;
        net_profit: number;
    };
}

export interface OperationRequest extends ServiceRequest {
    // Additional fields specific to logistics/operations if any
}

export interface Notification {
    id: number | string;
    title: string;
    title_bn?: string;
    message: string;
    message_bn?: string;
    link?: string;
    notification_type: string;
    is_read: boolean;
    created_at: string;
    is_transient?: boolean;
    user_id?: number;
}