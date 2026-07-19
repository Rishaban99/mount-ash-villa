'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Bill } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import { 
  Printer, 
  Download, 
  X, 
  Coins, 
  Settings, 
  Clock, 
  UserRound, 
  CreditCard, 
  Bed,
  Utensils
} from 'lucide-react';

interface ReceiptProps {
  bill: Bill;
  onClose: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({ bill, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<any>(null);

  // Customized Interactive States (the "current" dynamic features)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [overrideCurrency, setOverrideCurrency] = useState<string>('');
  const [localPaperWidth, setLocalPaperWidth] = useState<'58mm' | '80mm' | 'A4'>('80mm');
  const [localShowLogo, setLocalShowLogo] = useState<boolean>(true);
  const [localShowTax, setLocalShowTax] = useState<boolean>(true);
  const [printLogs, setPrintLogs] = useState<any[]>([]);

  useEffect(() => {
    if (bill?.id) {
      const fetchPrintLogs = async () => {
        try {
          const res = await apiFetch(`/api/print-logs?billId=${bill.id}`);
          if (res.ok) {
            const data = await res.json();
            setPrintLogs(data);
          }
        } catch (e) {
          console.error('Failed to fetch print logs', e);
        }
      };
      fetchPrintLogs();
    }
  }, [bill?.id]);

  const recordPrintAction = async () => {
    if (!bill?.id) return;
    try {
      const res = await apiFetch('/api/print-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          billLabel: bill.id,
          guestName: bill.guestDetails?.name || '',
          totalAmount: bill.totalAmount || 0,
          paymentMethod,
          paperWidth: localPaperWidth,
          currency: overrideCurrency || settings?.currency || 'Rs.',
        }),
      });
      if (res.ok) {
        const newLog = await res.json();
        setPrintLogs((prev) => [newLog, ...prev]);
      }
    } catch (e) {
      console.error('Failed to save print log', e);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('system_settings_cache');
    if (cached) {
      try {
        const cachedObj = JSON.parse(cached);
        setSettings(cachedObj);
        initSettings(cachedObj);
      } catch (e) {}
    }

    // Refresh settings via API
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          localStorage.setItem('system_settings_cache', JSON.stringify(data));
          initSettings(data);
        }
      } catch (err) {
        console.error('Failed to sync settings in Receipt interface', err);
      }
    };
    fetchSettings();
  }, []);

  const initSettings = (data: any) => {
    if (data.paperWidth) setLocalPaperWidth(data.paperWidth);
    if (data.showLogoOnReceipt !== undefined) setLocalShowLogo(data.showLogoOnReceipt);
    if (data.showTaxDetails !== undefined) setLocalShowTax(data.showTaxDetails);
    if (data.currency) setOverrideCurrency(data.currency);
  };

  // System fallbacks merged with stored settings
  const s = {
    hotelName: 'Grand Palace Hotel',
    phone: '+94 77 123 4567',
    address: '100, Palace Boulevard, Colombo, Sri Lanka',
    currency: 'Rs.',
    taxNumber: '',
    email: 'reservations@grandpalace.com',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    receiptFooterMessage: 'Thank you for staying with us! Please visit again.',
    serviceChargePercent: 10,
    vatPercent: 0,
    printerType: 'thermal',
    paperWidth: '80mm',
    printerConnection: 'browser',
    showLogoOnReceipt: true,
    showTaxDetails: true,
    ...settings
  };

  const activeCurrency = overrideCurrency || s.currency || 'Rs.';

  const paperWidthClass = localPaperWidth === '58mm' 
    ? 'w-[250px] text-[11px] leading-tight pb-6 pt-3 px-3' 
    : localPaperWidth === 'A4' 
    ? 'w-full max-w-[650px] text-sm p-8 bg-slate-50/50' 
    : 'w-[340px] text-xs p-5';

  const handlePrint = () => {
    recordPrintAction();
    const printContent = document.getElementById('thermal-receipt-printable');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Hotel Receipt - ${bill.id}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Inter:wght@400;500;600;700;900&display=swap');
                @page {
                  size: auto;
                  margin: 0px 0px 0px 0px;
                }
                body {
                  font-family: 'JetBrains Mono', Courier, monospace;
                  font-size: ${localPaperWidth === '58mm' ? '11px' : localPaperWidth === 'A4' ? '14px' : '13px'};
                  color: black;
                  padding: 12px;
                  width: ${localPaperWidth === '58mm' ? '240px' : localPaperWidth === 'A4' ? '100%' : '320px'};
                  margin: 0 auto;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .border-b { border-bottom: 1px dashed black; margin: 8px 0; }
                .flex { display: flex; justify-content: space-between; }
                .font-bold { font-weight: bold; }
                .my-2 { margin: 8px 0; }
                .my-4 { margin: 16px 0; }
                .pb-2 { padding-bottom: 8px; }
                svg { display: block; margin: 0 auto 10px; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleSaveAsPDF = () => {
    const guest = bill.guestDetails;
    const lines = [
      '========================================',
      `         ${s.hotelName.toUpperCase()}         `,
      `      ${s.address}       `,
      `        Tel: ${s.phone}            `,
      s.email ? `      Email: ${s.email}      ` : '',
      s.taxNumber ? `        Tax No: ${s.taxNumber}        ` : '',
      '========================================',
      `Receipt ID : ${bill.id}`,
      `Date       : ${new Date(bill.updatedAt).toLocaleString()}`,
      `Guest Name : ${guest.name}`,
      `NIC/Pass   : ${guest.nic}`,
      `Served By  : ${currentUser?.name || 'Administrator'} (${currentUser?.role || 'Admin'})`,
      `Paid via   : ${paymentMethod}`,
      '========================================',
      'ROOM CHARGES:',
    ];

    bill.roomItems.forEach((item: any) => {
      const originalPerNight = item.originalPricePerNight || (item.pricePerNight + (item.discount || 0));
      const discountPerNight = Math.max(0, originalPerNight - item.pricePerNight);
      const originalTotal = originalPerNight * item.nights;
      const discountTotal = discountPerNight * item.nights;
      const finalTotal = item.pricePerNight * item.nights;

      lines.push(`${item.roomNumber} (${item.roomType})`);
      lines.push(`  Duration       : ${item.nights} Night(s)`);
      lines.push(`  Standard Rate  : ${activeCurrency} ${originalPerNight.toLocaleString()} / night`);
      lines.push(`  Standard Total : ${activeCurrency} ${originalTotal.toLocaleString()}`);
      if (discountTotal > 0) {
        lines.push(`  Discount Amt   : -${activeCurrency} ${discountTotal.toLocaleString()}`);
      }
      lines.push(`  Charged Total  : ${activeCurrency} ${finalTotal.toLocaleString()}`);
    });

    if (bill.foodItems.length > 0) {
      lines.push('----------------------------------------');
      lines.push('FOOD ORDERS:');
      bill.foodItems.forEach(item => {
        lines.push(`${item.foodName}`);
        lines.push(`  ${item.quantity} x ${activeCurrency} ${item.price} = ${activeCurrency} ${item.quantity * item.price}`);
      });
    }

    const totalOriginalRoomCost = bill.roomItems.reduce((acc, item: any) => {
      const originalPerNight = item.originalPricePerNight || (item.pricePerNight + (item.discount || 0));
      return acc + originalPerNight * item.nights;
    }, 0);
    const totalRoomDiscounts = Math.max(0, totalOriginalRoomCost - bill.roomSubtotal);

    lines.push('========================================');
    lines.push(`Room Standard : ${activeCurrency} ${totalOriginalRoomCost.toLocaleString()}`);
    if (totalRoomDiscounts > 0) {
      lines.push(`Room Discount : -${activeCurrency} ${totalRoomDiscounts.toLocaleString()}`);
    }
    lines.push(`Room Subtotal : ${activeCurrency} ${bill.roomSubtotal}`);
    if (bill.foodItems.length > 0) {
      lines.push(`Food Subtotal : ${activeCurrency} ${bill.foodSubtotal}`);
    }

    if (localShowTax) {
      if (bill.foodItems.length > 0) {
        lines.push(`Service Chg(${settings?.serviceChargePercent || 10}%): ${activeCurrency} ${bill.serviceCharge}`);
      }
      if (s.vatPercent > 0) {
        const vatVal = Math.round((bill.roomSubtotal + (bill.foodSubtotal || 0)) * (s.vatPercent / 100));
        lines.push(`VAT Surcharge (${s.vatPercent}%): ${activeCurrency} ${vatVal}`);
      }
    }

    lines.push('----------------------------------------');
    lines.push(`GRAND TOTAL   : ${activeCurrency} ${bill.totalAmount}`);
    lines.push('========================================');
    lines.push(`      ${s.receiptFooterMessage}    `);
    lines.push('========================================');

    const txtContent = lines.filter(line => line !== '').join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${bill.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl p-4 md:p-6 overflow-hidden border border-slate-100 flex flex-col md:flex-row gap-6 max-h-[95vh] md:max-h-[85vh]">
        
        {/* Left Side: Receipt Dynamic Feature Control & Info Panel */}
        <div id="receipt-controls-panel" className="w-full md:w-80 shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 overflow-y-auto max-h-[50vh] md:max-h-none scrollbar-thin">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600 animate-spin-slow" />
                <span className="font-display font-bold text-slate-800 text-sm tracking-tight">Receipt Customizer</span>
              </div>
              <button 
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              Verify stay dimensions, custom currency and operational badges dynamically prior to printer or digital storage handover.
            </p>

            {/* Cashier Context Badge */}
            <div className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-2xl flex items-center gap-2">
              <UserRound className="h-4 w-4 text-indigo-500 shrink-0" />
              <div className="space-y-0.5 text-left">
                <p className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Current POS Operator</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-750">{currentUser?.name || 'Administrator'}</span>
                  <span className="text-[7px] bg-indigo-100/60 text-indigo-700 px-1.5 rounded font-black uppercase tracking-wide">
                    {currentUser?.role || 'Admin'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Payment Settlement Mode</label>
              <div className="grid grid-cols-3 gap-1">
                {(['Cash', 'Card', 'Bank Transfer'] as const).map((method) => {
                  const isActive = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-1 text-[10px] font-bold rounded-xl border transition-all text-center border-0 cursor-pointer ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currency Customizer Feature */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Local Currency Unit</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={5}
                  value={overrideCurrency}
                  onChange={(e) => setOverrideCurrency(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-850"
                  placeholder="e.g. Rs., $, €, ₹"
                />
                <div className="flex gap-1">
                  {['Rs.', '$', '€', '₹'].map(curSymbol => (
                    <button
                      key={curSymbol}
                      type="button"
                      onClick={() => setOverrideCurrency(curSymbol)}
                      className={`px-2 text-xs font-bold border rounded-lg border-slate-200 hover:bg-slate-50 transition-colors uppercase cursor-pointer ${overrideCurrency === curSymbol ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white text-slate-600'}`}
                    >
                      {curSymbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Spool Dimension */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Spool / Roll Width</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: '80mm', label: '80mm Standard' },
                  { value: '58mm', label: '58mm Micro' },
                  { value: 'A4', label: 'A4 Statement' }
                ].map((opt) => {
                  const isActive = localPaperWidth === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalPaperWidth(opt.value as any)}
                      className={`py-1.5 px-0.5 text-[9px] font-black rounded-lg border hover:bg-slate-50 border-slate-200 transition-all text-center cursor-pointer ${
                        isActive 
                          ? 'bg-slate-800 border-slate-900 text-white hover:bg-slate-850' 
                          : 'bg-white text-slate-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>


            {/*print history*/}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Print History</label>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[9px] text-slate-600">
                  <span>Last Printed:</span>
                  <span className="font-bold text-slate-800">
                    {printLogs.length > 0 
                      ? new Date(printLogs[0].printedAt).toLocaleString() 
                      : 'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-600">
                  <span>Prints This Week:</span>
                  <span className="font-bold text-slate-800">
                    {printLogs.filter(l => new Date(l.printedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length}
                  </span>
                 </div> 

                 </div>

                {/*print history table */}

              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                {printLogs.length > 0 ? (
                  printLogs.slice(0, 5).map((log, idx) => (
                    <div key={log.id || idx} className="flex items-center justify-between text-[9px] text-slate-700 bg-slate-50 px-2 py-1 rounded-lg">
                      <span>Print #{printLogs.length - idx}</span>
                      <span>{new Date(log.printedAt).toLocaleString()}</span>
                    </div>
                  ))
                ) : ( 

                  <div className="text-[9px] text-slate-400 italic text-center py-2">
                    No print history available.
                  </div>
                )}



              </div>

            </div>
            
          </div>

          {/* Large Screen Trigger Suite */}
          <div className="hidden md:flex flex-col gap-2 pt-4 border-t border-slate-150">
            <button
              onClick={handlePrint}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-105 border-0 cursor-pointer text-center text-xs"
            >
              <Printer className="h-4 w-4" />
              Print Selected Roll
            </button>
            <button
              onClick={handleSaveAsPDF}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all border-0 cursor-pointer text-center text-[10px] uppercase tracking-wide"
            >
              <Download className="h-3.5 w-3.5" />
              Download Slip
            </button>
          </div>
        </div>

        {/* Right Side: Scrollable Virtual POS Roll Viewport */}
        <div className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col min-h-0 overflow-hidden relative">
          
          <div className="no-print h-9 bg-slate-200/50 px-4 flex items-center justify-between text-xs text-slate-500 font-sans tracking-wide shrink-0 border-b border-slate-200">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              POS Printer Preview
            </span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="bg-slate-350 text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold leading-none">{localPaperWidth}</span>
              <button 
                onClick={onClose}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 border-0 cursor-pointer transition-colors"
                title="Exit view"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Virtual Paper Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center items-start scrollbar-thin">
            <div 
              id="thermal-receipt-printable" 
              ref={receiptRef}
              className={`bg-white shadow-md border border-dashed border-slate-400 text-slate-900 font-mono leading-relaxed transition-all duration-200 ${paperWidthClass}`}
            >
              {/* Receipt Header Logo */}
           
                <div 
                  className="mx-auto mb-2 text-center" 
                  style={{ 
                    display: 'block', 
                    marginLeft: 'auto', 
                    marginRight: 'auto', 
                    width: 'fit-content', 
                    textAlign: 'center'
                  }}
                >
                  <Logo size={90} showText={true} className="text-slate-950 mx-auto" style={{ margin: '0 auto' }} />
                </div>
              

              {/* Title & Static Info */}
              <div className="text-center">
                {!localShowLogo && (
                  <h2 className="text-xs font-bold leading-tight tracking-tight uppercase mb-1">{s.hotelName}</h2>
                )}
                <p className="text-[9px] text-slate-600 leading-tight whitespace-pre-line">{s.address}</p>
                <p className="text-[9px] text-slate-600">Tel: {s.phone} {s.email && `| Email: ${s.email}`}</p>
                {s.taxNumber && <p className="text-[9px] text-slate-600 font-bold">TIN: {s.taxNumber}</p>}
              </div>

              <div className="border-b border-dashed border-slate-400 my-3" />

              {/* Billing Metadata */}
              <div className="space-y-0.5 text-[10px] leading-relaxed">
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span className="font-bold text-slate-950">{bill.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span className="text-slate-700">{new Date(bill.updatedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-950">{bill.guestDetails.name}</span>
                </div>
                {bill.guestDetails.nic && (
                  <div className="flex justify-between">
                    <span>NIC/Pass:</span>
                    <span className="text-slate-700">{bill.guestDetails.nic}</span>
                  </div>
                )}

                {/* Cashier + Payment Method badge parameters */}
                <div className="flex justify-between border-t border-dashed border-slate-200 mt-1 pt-1 text-[9px] text-slate-700">
                  <span>Payment:</span>
                  <span className="font-bold uppercase tracking-wider">{paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-700">
                  <span>Cashier:</span>
                  <span className="font-bold">{currentUser?.name || 'Administrator'}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-3" />

              {/* Rooms detail list */}
              <div className="text-[10px] leading-normal font-mono">
                <p className="font-bold underline uppercase mb-1.5 flex items-center gap-1 font-sans">
                  Room Charges
                </p>
                {bill.roomItems.map((item: any, idx) => {
                  const originalPerNight = item.originalPricePerNight || (item.pricePerNight + (item.discount || 0));
                  const discountPerNight = Math.max(0, originalPerNight - item.pricePerNight);
                  const originalTotal = originalPerNight * item.nights;
                  const discountTotal = discountPerNight * item.nights;
                  const finalTotal = item.pricePerNight * item.nights;

                  return (
                    <div key={idx} className="mb-2 last:mb-0 border-b border-dashed border-slate-100 last:border-0 pb-1.5 last:pb-0">
                      <div className="flex justify-between font-bold text-slate-900 font-sans">
                        <span>Room {item.roomNumber} ({item.roomType})</span>
                        <span>{activeCurrency} {finalTotal.toLocaleString()}</span>
                      </div>
                      <div className="text-slate-600 text-[9px] space-y-0.5 mt-0.5">
                        <div className="flex justify-between">
                          <span>Nights & Rate:</span>
                          <span>{item.nights} Night(s) x {activeCurrency}{originalPerNight.toLocaleString()}</span>
                        </div>
                        
                       
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Foods detail list */}
              {bill.foodItems.length > 0 && (
                <>
                  <div className="border-b border-dashed border-slate-400 my-3" />
                  <div className="text-[10px] leading-normal font-mono">
                    <p className="font-bold underline uppercase mb-1.5 flex items-center gap-1 font-sans">
                      Food Orders
                    </p>
                    {bill.foodItems.map((item, idx) => (
                      <div key={idx} className="mb-1.5">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{item.foodName}</span>
                          <span>{activeCurrency} {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-600 text-[9px]">
                          {item.quantity} x {activeCurrency} {item.price.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="border-b border-dashed border-slate-400 my-3" />

              {/* Totals Sheet */}
              <div className="space-y-1  leading-relaxed">
                {(() => {
                  const finalOriginalRoomTotal = bill.roomItems.reduce((acc, item: any) => acc + (item.originalPricePerNight || (item.pricePerNight + (item.discount || 0))) * item.nights, 0);
                  const finalRoomDiscountTotal = Math.max(0, finalOriginalRoomTotal - bill.roomSubtotal);
                  return (
                    <>
                    {finalRoomDiscountTotal > 0 && (
                        <div className="flex justify-between font-medium text-rose-600">
                          <span>Room Discount Amount:</span>
                          <span>-{activeCurrency} {finalRoomDiscountTotal.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-b border-dotted border-slate-200 pb-1 mb-1">
                        <span>Rooms Subtotal (Charged):</span>
                        <span>{activeCurrency} {bill.roomSubtotal.toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
                {bill.foodItems.length > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Foods Subtotal:</span>
                    <span>{activeCurrency} {bill.foodSubtotal.toLocaleString()}</span>
                  </div>
                )}
                
                
                  <>
                    {bill.foodItems.length > 0 && (
                      <div className="flex justify-between text-slate-600 text-[9px]">
                        <span>Cuisine Service Chg ({settings?.serviceChargePercent || 10}%):</span>
                        <span>{activeCurrency} {bill.serviceCharge.toLocaleString()}</span>
                      </div>
                    )}
                    {s.vatPercent > 0 && (
                      <div className="flex justify-between text-slate-600 text-[9px]">
                        <span>VAT Surcharge ({s.vatPercent}%):</span>
                        <span>{activeCurrency} {Math.round((bill.roomSubtotal + (bill.foodSubtotal || 0)) * (s.vatPercent / 100)).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                

                <div className="border-t border-dotted border-slate-400 pt-1.5 flex justify-between text-[20px] font-bold text-slate-950 mt-1.5">
                  <span className="tracking-tight">TOTAL</span>
                  <span className="font-black">{activeCurrency} {bill.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-3" />

              {/* Receipt Footer Message */}
              <div className="text-center text-[10px] text-slate-600 space-y-1">
                <p className="font-bold whitespace-pre-wrap">{s.receiptFooterMessage}</p>
              </div>

            </div>
          </div>

          {/* Quick Trigger matrix on Mobile Viewports */}
          <div className="no-print p-3 bg-white border-t border-slate-200 flex items-center gap-2 md:hidden shrink-0">
            <button
              onClick={handlePrint}
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all border-0 cursor-pointer text-center text-xs"
            >
              <Printer className="h-4 w-4" />
              Print Roll
            </button>
            <button
              onClick={handleSaveAsPDF}
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all border-0 cursor-pointer text-center text-xs"
            >
              <Download className="h-4 w-4" />
              Save Slip
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

