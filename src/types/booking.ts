export interface BookingUserRef {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
}

export interface BookingSpaceRef {
  _id: string;
  name?: string;
  city?: string;
  state?: string;
  pricePerMonth?: number;
  photos?: string[];
}

export interface Booking {
  _id: string;
  userId: string | BookingUserRef;
  spaceId: string | BookingSpaceRef;
  plan?: "coworking-space" | "private-office" | "virtual-office" | "serviced-office";
  date: string;
  seatsBooked: number;
  unitPrice?: number;
  totalAmount?: number;
  status: "pending" | "confirmed" | "cancelled" | "payment_failed";
  paymentOrderId?: string;
  paymentId?: string;
  paymentStatus?: "created" | "paid" | "failed";
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentOrderResponse {
  booking: Booking;
  payment: {
    gateway: "razorpay" | "mock";
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    bookingId: string;
  };
}

export interface OwnerAnalytics {
  totalSpaces: number;
  totalAvailableSeats: number;
  avgPrice: number;
  totalBookings: number;
  upcomingBookings: number;
  totalSeatsBooked: number;
}
