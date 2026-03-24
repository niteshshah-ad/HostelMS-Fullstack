import React from "react";
import { getApiUrl } from "../lib/api";

function PaymentButton() {

  // 🔹 Razorpay script loader
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      const res = await loadRazorpay();

      if (!res) {
        alert("Razorpay SDK failed to load ❌");
        return;
      }

      // 🔹 IMPORTANT: Backend me POST hona chahiye
      const response = await fetch(getApiUrl("/payments/create-order"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: 500 })
      });

      const order = await response.json();

      if (!response.ok) {
        alert("Order creation failed ❌");
        return;
      }

      const options = {
        key: "rzp_test_SJsO9PYAPhiYA7",
        amount: order.amount,
        currency: order.currency,
        name: "Hostel Admin",
        description: "Room Booking Payment",
        order_id: order.id,

        handler: async function (response) {
          const verifyRes = await fetch(getApiUrl("/payments/verify-payment"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(response)
          });

          if (verifyRes.ok) {
            alert("Payment Successful ✅");
          } else {
            alert("Payment verification failed ❌");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error(error);
      alert("Payment Failed ❌");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "30px" }}>
      <button onClick={handlePayment}>
        Pay ₹500
      </button>
    </div>
  );
}

export default PaymentButton;
