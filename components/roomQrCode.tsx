"use client";

import React, { useState } from "react";
import { FileText, ChevronRight, Home, CreditCard, ArrowLeft } from "lucide-react";

interface RoomQrCodeProps {
  roomId?: string;
  hotelName?: string;
}

export default function RoomQrCode({ 
  roomId = "Unknown", 
  hotelName = "Mount Ash Villa" 
}: RoomQrCodeProps) {
  const [showBill, setShowBill] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
      {!showBill ? (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl border border-gray-100">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white opacity-10"></div>
            
            <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-md">Welcome!</h1>
            <p className="text-indigo-100 font-medium text-lg">{hotelName}</p>
          </div>
          
          <div className="p-8 text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Home className="w-12 h-12 text-indigo-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Room {roomId}</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              We hope you are enjoying your stay. You can view your current bill details by clicking the button below.
            </p>
            
            <button
              onClick={() => setShowBill(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-indigo-500/30 group"
            >
              <FileText className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
              Show Bill
              <ChevronRight className="w-5 h-5 ml-auto opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center">
            <button 
              onClick={() => setShowBill(false)}
              className="p-2 mr-3 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Your Bill Details</h2>
          </div>
          
          <div className="p-8">
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Room Charge</span>
                  <span className="font-semibold text-gray-800">$150.00</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Room Service</span>
                  <span className="font-semibold text-gray-800">$45.00</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Taxes & Fees</span>
                  <span className="font-semibold text-gray-800">$19.50</span>
                </div>
                
                <div className="border-t border-dashed border-gray-300 pt-4 mt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-indigo-600">$214.50</span>
                </div>
              </div>
            </div>
            
            <button className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg group">
              <CreditCard className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
              Pay at Front Desk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
