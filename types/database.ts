
export interface Batch {
  batch_id: number;
  batch_name: 'rankers' | 'sadhana' | 'lakshya';
  cost: number;
  duration_months: number;
  features: string;
  has_doubts_access: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  payment_id: number;
  student_name: string;
  phone: string;
  email: string;
  batch_id: number;
  amount_paid: number;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  payment_status: 'success' | 'pending' | 'failed';
  payment_date: string;
  access_granted: boolean;
  batches?: Batch;
}

export interface UserProfile {
  user_id: string;
  email: string;
  student_name: string;
  phone: string;
  batch_id: number;
  payment_id: number | null;
  youtube_channel_added: boolean;
  account_status: 'active' | 'suspended';
  created_at: string;
  last_login: string | null;
  batches?: Batch;
}

export interface DailyClass {
  class_id: number;
  date: string;
  subject: 'maths' | 'physics' | 'chemistry';
  teacher_name: string;
  teacher_photo_url: string;
  class_title: string;
  duration: string;
  youtube_live_link: string;
  is_active: boolean;
}
