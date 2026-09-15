import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import paymentService from '../../services/paymentService';
import {
  CreditCard,
  ShieldCheck,
  Smartphone,
  Building,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info
} from 'lucide-react';

/**
 * SmartShelf Demo Payment Modal
 * Designed specifically for Academic / College portfolio demonstration.
 * Never requests or stores real money, card numbers, CVV, UPI PIN, or bank credentials.
 */
const DemoPaymentModal = ({
  isOpen,
  onClose,
  order,
  orders = [], // Supported for multi-store basket orders
  onSuccess,
  onFailure
}) => {
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulationState, setSimulationState] = useState(null); // 'success' | 'failure' | null
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate order details (handles single or multi-store orders)
  const targetOrders = orders.length > 0 ? orders : order ? [order] : [];
  const totalAmount = targetOrders.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const orderCount = targetOrders.length;
  const primaryOrder = targetOrders[0] || {};

  const handleSimulateSuccess = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      // Simulate realistic network latency (1.0s)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedOrders = [];
      for (const ord of targetOrders) {
        const orderId = ord._id || ord.id;
        const res = await paymentService.simulateDemoSuccess({
          orderId,
          method: selectedMethod
        });
        if (res.success && res.data) {
          updatedOrders.push(res.data);
        }
      }

      setSimulationState('success');
      setTimeout(() => {
        setIsProcessing(false);
        if (onSuccess) {
          onSuccess(updatedOrders.length === 1 ? updatedOrders[0] : updatedOrders);
        }
      }, 800);
    } catch (err) {
      console.error('[DemoPaymentModal] Success simulation error:', err);
      setIsProcessing(false);
      setErrorMessage(err.response?.data?.message || err.message || 'Payment simulation failed.');
    }
  };

  const handleSimulateFailure = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const updatedOrders = [];
      for (const ord of targetOrders) {
        const orderId = ord._id || ord.id;
        const res = await paymentService.simulateDemoFailure({
          orderId,
          reason: 'User simulated card decline / payment timeout'
        });
        if (res.success && res.data) {
          updatedOrders.push(res.data);
        }
      }

      setSimulationState('failure');
      setTimeout(() => {
        setIsProcessing(false);
        if (onFailure) {
          onFailure(updatedOrders.length === 1 ? updatedOrders[0] : updatedOrders);
        }
      }, 800);
    } catch (err) {
      console.error('[DemoPaymentModal] Failure simulation error:', err);
      setIsProcessing(false);
      setErrorMessage(err.response?.data?.message || err.message || 'Simulation error.');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Modal Header & Academic Notice */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#2E7D32] flex items-center justify-center font-black">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">SmartShelf Checkout</h3>
                <p className="text-xs text-slate-500">Academic & Portfolio Demonstration</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300">
              <Sparkles className="w-3 h-3 text-amber-700" />
              Demo Payment
            </span>
          </div>

          {/* Academic Mode Warning Banner */}
          <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No real money will be charged.</p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                This project uses a realistic simulated payment provider for academic evaluation. Do not enter real cards, CVVs, or bank credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Order Reference:</span>
            <span className="font-mono font-bold text-slate-900">
              {orderCount > 1 ? `${orderCount} Store Orders (${primaryOrder.basketGroupId || 'Basket'})` : primaryOrder.orderNumber}
            </span>
          </div>
          {primaryOrder.recipeName && (
            <div className="flex justify-between items-center text-slate-600">
              <span>Recipe:</span>
              <span className="font-bold text-amber-800">🍬 {primaryOrder.recipeName}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-600">
            <span>Store:</span>
            <span className="font-semibold text-slate-800">
              {orderCount > 1 ? `${orderCount} Local Stores` : (primaryOrder.storeName || 'SmartShelf Partner Store')}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm font-black text-[#2E7D32] pt-2 border-t border-slate-200">
            <span>Total Payable:</span>
            <span className="text-lg">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Simulation State Animations */}
        {simulationState === 'success' ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-scale-up">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-sm font-extrabold text-emerald-900">Simulated Payment Captured!</h4>
            <p className="text-xs text-emerald-700">
              Demo transaction successful. Transitioning order to <strong>Waiting for Store Acceptance</strong>...
            </p>
          </div>
        ) : simulationState === 'failure' ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2 animate-scale-up">
            <XCircle className="w-12 h-12 text-rose-600 mx-auto" />
            <h4 className="text-sm font-extrabold text-rose-900">Payment Simulation Declined</h4>
            <p className="text-xs text-rose-700">
              Payment was marked as failed. Your reservation hold is preserved so you can retry anytime.
            </p>
          </div>
        ) : (
          /* Payment Method Selection */
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Select Simulated Payment Method:
            </label>

            <div className="space-y-2">
              {/* Option 1: UPI */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'UPI'
                    ? 'border-[#2E7D32] bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="demoPaymentMethod"
                    value="UPI"
                    checked={selectedMethod === 'UPI'}
                    onChange={() => setSelectedMethod('UPI')}
                    className="w-4 h-4 text-[#2E7D32] focus:ring-[#2E7D32]"
                  />
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">UPI / QR (Simulated)</p>
                      <p className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm (Instant Demo Capture)</p>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Simulated
                </span>
              </label>

              {/* Option 2: Card */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'CARD'
                    ? 'border-[#2E7D32] bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="demoPaymentMethod"
                    value="CARD"
                    checked={selectedMethod === 'CARD'}
                    onChange={() => setSelectedMethod('CARD')}
                    className="w-4 h-4 text-[#2E7D32] focus:ring-[#2E7D32]"
                  />
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Credit / Debit Card (Simulated)</p>
                      <p className="text-[11px] text-slate-500">Visa, Mastercard, RuPay (No card details needed)</p>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                  Simulated
                </span>
              </label>

              {/* Option 3: Net Banking */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'NET_BANKING'
                    ? 'border-[#2E7D32] bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="demoPaymentMethod"
                    value="NET_BANKING"
                    checked={selectedMethod === 'NET_BANKING'}
                    onChange={() => setSelectedMethod('NET_BANKING')}
                    className="w-4 h-4 text-[#2E7D32] focus:ring-[#2E7D32]"
                  />
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-600" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Net Banking (Simulated)</p>
                      <p className="text-[11px] text-slate-500">HDFC, SBI, ICICI, Axis (Simulated bank approval)</p>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  Simulated
                </span>
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 space-y-2">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center shadow-md text-sm font-extrabold py-3"
                loading={isProcessing}
                icon={ShieldCheck}
                onClick={handleSimulateSuccess}
              >
                Simulate Successful Payment (₹{totalAmount.toFixed(2)})
              </Button>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSimulateFailure}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline transition-colors py-1.5"
                >
                  Simulate Payment Failure
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onClose}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline transition-colors py-1.5"
                >
                  Pay Later at Store / Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DemoPaymentModal;
