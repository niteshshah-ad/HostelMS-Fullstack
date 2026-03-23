import os
import razorpay
import hmac
import hashlib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

key = os.getenv("RAZORPAY_KEY_ID")
secret = os.getenv("RAZORPAY_KEY_SECRET")

razorpay_client = razorpay.Client(auth=(key, secret))


class VerifyPayment(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class CreateOrderRequest(BaseModel):
    amount: int
    receipt: str | None = None
    notes: dict | None = None


@router.post("/create-order")
def create_order(data: CreateOrderRequest):
    order = razorpay_client.order.create({
        "amount": data.amount * 100,
        "currency": "INR",
        "payment_capture": 1,
        "receipt": data.receipt,
        "notes": data.notes or {},
    })
    return order


@router.post("/verify-payment")
def verify_payment(data: VerifyPayment):

    generated_signature = hmac.new(
        bytes(secret, 'utf-8'),
        bytes(data.razorpay_order_id + "|" + data.razorpay_payment_id, 'utf-8'),
        hashlib.sha256
    ).hexdigest()

    if generated_signature == data.razorpay_signature:
        return {"status": "Payment verified successfully"}

    raise HTTPException(status_code=400, detail="Payment verification failed")
