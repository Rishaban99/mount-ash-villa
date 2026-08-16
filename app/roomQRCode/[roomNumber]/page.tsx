'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GuestAmbientBackground } from '@/components/GuestAmbientBackground';
import { Logo } from '@/components/Logo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomInfo {
  id: string;
  roomNumber: string;
  roomType: string;
  price: number;
  status: string;
}

interface GuestDetails {
  name: string;
  phone: string;
  nic: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
}

interface RoomItem {
  roomNumber: string;
  roomType: string;
  pricePerNight: number;
  nights: number;
  discount?: number;
}

interface FoodItem {
  foodName: string;
  price: number;
  quantity: number;
}

interface BillInfo {
  id: string;
  guestDetails: GuestDetails;
  roomItems: RoomItem[];
  foodItems: FoodItem[];
  foodSubtotal: number;
  serviceCharge: number;
  roomSubtotal: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface HotelSettings {
  hotelName: string;
  phone: string;
  address: string;
  currency: string;
  serviceChargePercent: number;
  checkInTime: string;
  checkOutTime: string;
}

interface ApiResponse {
  room: RoomInfo;
  bill: BillInfo | null;
  settings: HotelSettings;
  sessionExpiresAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function firstName(fullName: string) {
  return fullName.trim().split(' ')[0];
}

function nightsBetween(checkIn: string, checkOut: string) {
  try {
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
  } catch {
    return 1;
  }
}

function IconBuilding({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}

function IconPhone({ size = 18 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M8 13.478v-.616s0-1.466 4-1.466s4 1.466 4 1.466v.388c0 .956.723 1.77 1.7 1.912l2 .294c1.21.177 2.3-.73 2.3-1.913v-2.125c0-.587-.184-1.164-.63-1.562C20.23 8.837 17.42 7 12 7c-5.749 0-8.56 2.583-9.56 3.789c-.315.381-.44.864-.44 1.352v1.923c0 1.298 1.296 2.228 2.58 1.852l2-.587c.843-.247 1.42-.998 1.42-1.85"
      />
    </svg>
  );
}

function IconMessage({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function WelcomeScreen({
  hotelName,
  roomNumber,
  guestName,
  onContinue,
}: {
  hotelName: string;
  roomNumber: string;
  guestName: string;
  onContinue: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`welcome-screen ${visible ? 'welcome-in' : ''}`}>
      <div className="welcome-content">
        <div className="welcome-logo-container">
          <Logo size={168} showText={true} useBrandColors={true} animated3D={true} />
        </div>

        <p className="welcome-eyebrow">{hotelName}</p>
        <div className="welcome-divider" />

        <p className="welcome-greeting">{getGreeting()}</p>
        <h1 className="welcome-name">{firstName(guestName)}</h1>

        <div className="welcome-room-tag">Room {roomNumber}</div>

        <p className="welcome-message">
          A live folio of your stay — quietly updated<br />
          for you throughout your visit.
        </p>

        <button className="welcome-btn" onClick={onContinue}>
          <span>View My Folio</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        <p className="welcome-note">Private · Secure · No login required</p>
      </div>
    </div>
  );
}

// ─── Feedback Modal ──────────────────────────────────────────────────────────

const FEEDBACK_CATEGORIES = ['Room Quality', 'Cleanliness', 'Food & Drinks', 'Staff Service', 'Other'];

function FeedbackModal({
  hotelName,
  roomNumber,
  guestName,
  onClose,
}: {
  hotelName: string;
  roomNumber: string;
  guestName?: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await fetch('/api/guest/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber,
          guestName,
          rating,
          category,
          message,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fb-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fb-modal" role="dialog" aria-modal="true" aria-labelledby="fb-title">
        {/* Close */}
        <button className="fb-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {submitted ? (
          /* ── Thank you state ── */
          <div className="fb-thankyou">
            <div className="fb-ty-icon" aria-hidden>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="fb-ty-title">Thank You</h3>
            <p className="fb-ty-sub">
              Your feedback means a lot to us.<br />
              We&apos;ll use it to improve your experience.
            </p>
            <button className="fb-done-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <div className="fb-header">
              <div className="fb-header-icon"><IconMessage size={22} /></div>
              <div>
                <h3 className="fb-title" id="fb-title">Guest Feedback</h3>
                <p className="fb-subtitle">{hotelName} · Room {roomNumber}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="fb-stars-label">How was your experience?</div>
            <div className="fb-stars">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  className={`fb-star ${s <= (hovered || rating) ? 'fb-star-on' : ''}`}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                  aria-label={`${s} star`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="fb-rating-label">
              {rating === 0 && <span className="fb-rating-hint">Tap a star to rate</span>}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </div>

            {/* Category chips */}
            <div className="fb-chips-label">Category (optional)</div>
            <div className="fb-chips">
              {FEEDBACK_CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`fb-chip ${category === c ? 'fb-chip-on' : ''}`}
                  onClick={() => setCategory(category === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Message */}
            <div className="fb-msg-label">Tell us more (optional)</div>
            <textarea
              className="fb-textarea"
              placeholder="Any comments or suggestions..."
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
            />
            <div className="fb-char-count">{message.length}/300</div>

            {/* Submit */}
            <button
              className={`fb-submit ${rating === 0 ? 'fb-submit-disabled' : ''}`}
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
            >
              {submitting ? (
                <span className="fb-spinner" />
              ) : (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  Submit Feedback
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Bill Header ──────────────────────────────────────────────────────────────

function BillHeader({
  hotelName,
  roomNumber,
  roomType,
}: {
  hotelName: string;
  roomNumber: string;
  roomType?: string;
  address?: string;
}) {
  return (
    <header className="bill-header">
      <div className="bill-header-inner">
        <div className="bill-brand-text">
          <p className="bill-header-kicker">Guest Folio</p>
          <p className="bill-hotel-label">{hotelName}</p>
        </div>
        <div className="bill-room-chip">
          <span className="bill-room-num">{roomNumber}</span>
          {roomType && (
            <>
              <span className="bill-room-sep" aria-hidden />
              <span className="bill-room-type">{roomType}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Bill Page ────────────────────────────────────────────────────────────────

function BillPage({ data }: { data: ApiResponse }) {
  const [visible, setVisible] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const { room, bill, settings } = data;
  const currency = settings.currency || 'LKR';

  if (!bill || room.status !== 'Occupied') {
    return (
      <div className={`bill-page ${visible ? 'bill-in' : ''}`}>
        <BillHeader
          hotelName={settings.hotelName}
          roomNumber={room.roomNumber}
          roomType={room.roomType}
        />
        <div className="no-bill-wrap">
          <div className="no-bill-icon"><IconBuilding size={36} /></div>
          <p className="no-bill-eyebrow">Guest Folio</p>
          <h2 className="no-bill-title">No Active Stay</h2>
          <p className="no-bill-sub">
            This room has no open billing session right now.
            Our front desk will be glad to assist you.
          </p>
          <div className="cta-stack">
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="cta-btn cta-call-btn">
                <IconPhone />
                <span>Call Front Desk</span>
              </a>
            )}
            <button
              type="button"
              className="cta-btn cta-feedback-btn"
              onClick={() => setShowFeedback(true)}
            >
              <IconMessage />
              <span>Share Feedback</span>
            </button>
          </div>
          {showFeedback && (
            <FeedbackModal
              hotelName={settings.hotelName}
              roomNumber={room.roomNumber}
              onClose={() => setShowFeedback(false)}
            />
          )}
        </div>
        <BillFooter settings={settings} />
      </div>
    );
  }

  const { guestDetails, roomItems, foodItems, foodSubtotal, serviceCharge, roomSubtotal, totalAmount } = bill;
  const nights = nightsBetween(guestDetails.checkInDate, guestDetails.checkOutDate);

  return (
    <div className={`bill-page ${visible ? 'bill-in' : ''}`}>
      <BillHeader
        hotelName={settings.hotelName}
        roomNumber={room.roomNumber}
        roomType={room.roomType}
        address={settings.address}
      />

      <div className="bill-body">

        {/* ── Welcome Banner ── */}
        <div className="welcome-banner">
          <div className="wb-left">
            <p className="wb-eyebrow">{getGreeting()}</p>
            <p className="wb-greeting">{firstName(guestDetails.name)}</p>
            <p className="wb-sub">Your stay folio at a glance</p>
          </div>
          <div className="wb-nights">
            <span className="wb-nights-num">{nights}</span>
            <span className="wb-nights-label">Night{nights !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ── Guest Card ── */}
        <div className="section-card">
          <div className="section-head">
            <span className="section-title">Guest Details</span>
          </div>
          <div className="detail-grid">
            <DetailRow label="Full Name" value={guestDetails.name} />
            {guestDetails.phone && <DetailRow label="Phone" value={guestDetails.phone} />}
            <DetailRow label="Check‑in" value={formatDate(guestDetails.checkInDate)} highlight />
            <DetailRow label="Check‑out" value={formatDate(guestDetails.checkOutDate)} highlight />
          </div>
        </div>

        {/* ── Room Charges ── */}
        {roomItems.length > 0 && (
          <div className="section-card">
            <div className="section-head">
              <span className="section-title">Room Charges</span>
            </div>
            {roomItems.map((item, i) => (
              
              <LineItem
                key={i}
                name={`Room ${item.roomNumber} · ${item.roomType}`}
                meta={`${currency} ${(item.pricePerNight+item.discount).toLocaleString()} × ${item.nights} night${item.nights !== 1 ? 's' : ''}${item.discount ? ` · ${(item.discount/(item.pricePerNight+item.discount)) * 100}% off` : ''}`}
                amount={item.pricePerNight * item.nights}
                currency={currency}
              />
            ))}
            <SubtotalRow label="Room Subtotal" amount={roomSubtotal} currency={currency} />
          </div>
        )}

        {/* ── Food & Beverage ── */}
        {foodItems.length > 0 && (
          <div className="section-card">
            <div className="section-head">
              <span className="section-title">Food &amp; Beverage</span>
            </div>
            {foodItems.map((item, i) => (
              <LineItem
                key={i}
                name={item.foodName}
                meta={`${currency} ${item.price.toLocaleString()} × ${item.quantity}`}
                amount={item.price * item.quantity}
                currency={currency}
              />
            ))}
            <SubtotalRow label="Food Subtotal" amount={foodSubtotal} currency={currency} />
            {serviceCharge > 0 && (
              <SubtotalRow
                label={`Service Charge (${settings.serviceChargePercent}%)`}
                amount={serviceCharge}
                currency={currency}
                accent
              />
            )}
          </div>
        )}

        {/* ── Total Card ── */}
        <div className="total-card">
          <div className="total-top">
            <div>
              <p className="total-label">Amount Due</p>
              <p className="total-bill-id">Folio #{bill.id.slice(0, 8)}</p>
            </div>
            <div className="total-status-chip">In Stay</div>
          </div>
          <div className="total-amount">
            <span className="total-currency">{currency}</span>
            <span className="total-number">{totalAmount.toLocaleString()}</span>
          </div>
          <p className="total-note">
            Live preview — final amount confirmed at checkout.
          </p>
        </div>

        <div className="cta-stack cta-stack-bill">
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="cta-btn cta-call-btn">
              <IconPhone />
              <span>Call Front Desk</span>
            </a>
          )}
          <button className="cta-btn cta-feedback-btn" onClick={() => setShowFeedback(true)}>
            <IconMessage />
            <span>Share Feedback</span>
          </button>
        </div>

        {/* ── Feedback Modal ── */}
        {showFeedback && (
          <FeedbackModal
            hotelName={settings.hotelName}
            roomNumber={room.roomNumber}
            guestName={guestDetails.name}
            onClose={() => setShowFeedback(false)}
          />
        )}
      </div>

      <BillFooter settings={settings} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={`detail-value ${highlight ? 'detail-highlight' : ''}`}>{value}</span>
    </div>
  );
}

function LineItem({ name, meta, amount, currency }: { name: string; meta: string; amount: number; currency: string }) {
  return (
    <div className="line-item">
      <div className="line-left">
        <p className="line-name">{name}</p>
        <p className="line-meta">{meta}</p>
      </div>
      <p className="line-amount">{currency} {amount.toLocaleString()}</p>
    </div>
  );
}

function SubtotalRow({ label, amount, currency, accent }: { label: string; amount: number; currency: string; accent?: boolean }) {
  return (
    <div className={`subtotal-row ${accent ? 'subtotal-accent' : ''}`}>
      <span>{label}</span>
      <span>{currency} {amount.toLocaleString()}</span>
    </div>
  );
}

function BillFooter({ settings }: { settings: HotelSettings }) {
  return (
    <footer className="bill-footer">
      <p className="footer-hotel">{settings.hotelName}</p>
      {settings.address && <p className="footer-sub">{settings.address}</p>}
      {settings.phone && (
        <p className="footer-sub footer-phone">
          <IconPhone size={12} />
          <span>{settings.phone}</span>
        </p>
      )}
      <p className="footer-tagline">Thank you for staying with us.</p>
    </footer>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type AppState = 'loading' | 'error' | 'welcome' | 'bill' | 'expired' | 'redirecting';

// ─── Session Expired Screen ───────────────────────────────────────────────────

function SessionExpiredScreen({ roomNumber }: { roomNumber: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`expired-screen ${visible ? 'expired-in' : ''}`}>
      <div className="expired-content">
        <div className="expired-icon" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="expired-eyebrow">Security Notice</p>
        <h1 className="expired-title">Session Expired</h1>
        <p className="expired-sub">
          For your privacy and security, this session has timed out after 5 minutes.
        </p>
        <div className="expired-divider" />
        <p className="expired-instruction">
          Please scan the QR code in your room again to view your folio.
        </p>
        <div className="expired-qr-icon" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 14v4M18 14v4" />
          </svg>
          <span>Scan QR Code Again</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RoomQRCodePage() {
  const { roomNumber } = useParams<{ roomNumber: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [data, setData] = useState<ApiResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('loading');
  const [timeLeft, setTimeLeft] = useState<number>(300); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Session Expiry Handler ──────────────────────────────────────────────
  const handleExpiry = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setData(null);          // immediately purge all bill data from memory
    setAppState('expired');
  };

  // ── Token Gate: redirect to scan API if no token in URL ────────────────
  useEffect(() => {
    if (!roomNumber) return;
    if (!token) {
      setAppState('redirecting');
      router.replace(`/api/guest/scan/${encodeURIComponent(roomNumber)}`);
    }
  }, [roomNumber, token, router]);

  // ── Fetch Bill Data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomNumber || !token) return;

    fetch(`/api/guest/room/${encodeURIComponent(roomNumber)}?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    })
      .then(async (r) => {
        const json = await r.json();
        if (r.status === 410 || r.status === 401) {
          setFetchError(json.error ?? 'Session expired.');
          setAppState('expired');
          return;
        }
        if (!r.ok || json.error) {
          setFetchError(json.error ?? 'Could not load folio.');
          setAppState('error');
          return;
        }

        setData(json);

        // Sync timer to precise server expiry time
        const secondsLeft = Math.max(
          0,
          Math.floor((new Date(json.sessionExpiresAt).getTime() - Date.now()) / 1000)
        );
        setTimeLeft(secondsLeft);

        if (secondsLeft === 0) {
          handleExpiry();
          return;
        }

        setAppState(json.bill && json.room.status === 'Occupied' ? 'welcome' : 'bill');
      })
      .catch(() => {
        setFetchError('Unable to reach the server. Please try again.');
        setAppState('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNumber, token]);

  // ── Countdown Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (appState !== 'bill' && appState !== 'welcome') return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  // ── Timer display helpers ───────────────────────────────────────────────
  const timerMinutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const timerSeconds = String(timeLeft % 60).padStart(2, '0');
  const timerUrgent = timeLeft <= 60;

  // ── Redirecting ───────────────────────────────────────────────────────
  if (appState === 'redirecting' || (!token && appState === 'loading')) {
    return (
      <div className="full-center gradient-bg">
        <GuestAmbientBackground />
        <div className="guest-foreground">
          <div className="loader-ring" />
          <p className="loader-text">Securing your session…</p>
        </div>
        <style>{BASE_CSS}</style>
      </div>
    );
  }

  // ── Expired ─────────────────────────────────────────────────────────────
  if (appState === 'expired') {
    return (
      <div className="app-root gradient-bg">
        <GuestAmbientBackground />
        <div className="guest-foreground">
          <SessionExpiredScreen roomNumber={typeof roomNumber === 'string' ? roomNumber : ''} />
        </div>
        <style>{BASE_CSS}</style>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <div className="full-center gradient-bg">
        <GuestAmbientBackground />
        <div className="guest-foreground">
          <div className="loader-ring" />
          <p className="loader-text">Preparing your folio…</p>
        </div>
        <style>{BASE_CSS}</style>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (appState === 'error' || !data) {
    return (
      <div className="full-center gradient-bg">
        <GuestAmbientBackground />
        <div className="guest-foreground">
          <div className="error-icon" aria-hidden>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          </div>
          <p className="error-title">Unable to load</p>
          <p className="error-msg">{fetchError ?? 'This room folio could not be opened.'}</p>
          <p className="error-hint">Please visit the front desk for assistance.</p>
        </div>
        <style>{BASE_CSS}</style>
      </div>
    );
  }

  // ── Welcome → Bill ───────────────────────────────────────────────────────
  return (
    <div className="app-root gradient-bg">
      {/* No-cache meta tags for extra browser protection */}
      <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <GuestAmbientBackground />
      <div className="guest-foreground">
        {/* Session Timer Bar — always visible when viewing folio */}
        {(appState === 'bill' || appState === 'welcome') && (
          <div className={`session-timer-bar ${timerUrgent ? 'session-timer-urgent' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="session-timer-label">Session</span>
            <span className="session-timer-count">{timerMinutes}:{timerSeconds}</span>
          </div>
        )}

        {appState === 'welcome' && data.bill && (
          <WelcomeScreen
            hotelName={data.settings.hotelName}
            roomNumber={data.room.roomNumber}
            guestName={data.bill.guestDetails.name}
            onContinue={() => setAppState('bill')}
          />
        )}
        {appState === 'bill' && <BillPage data={data} />}
      </div>
      <style>{BASE_CSS}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Outfit:wght@300;400;500;600&display=swap');

  :root {
    --ink: #0e1524;
    --ink-soft: #182338;
    --navy: #1E2460;
    --forest: #0E8345;
    --linen: #f3efe6;
    --linen-soft: #e8e2d6;
    --ivory: #faf7f1;
    --champagne: #c4a35a;
    --champagne-soft: rgba(196, 163, 90, 0.18);
    --champagne-line: rgba(196, 163, 90, 0.45);
    --text: #f3efe6;
    --text-muted: rgba(243, 239, 230, 0.62);
    --text-faint: rgba(243, 239, 230, 0.42);
    --card: rgba(250, 247, 241, 0.055);
    --card-border: rgba(243, 239, 230, 0.1);
    --radius: 14px;
    --font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    --font-body: 'Outfit', system-ui, sans-serif;
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #05070d; color: var(--text); }

  .gradient-bg {
    position: relative;
    isolation: isolate;
    min-height: 100dvh;
    overflow: hidden;
    background:
      radial-gradient(90% 60% at 10% 0%, rgba(18, 22, 48, 0.45) 0%, transparent 55%),
      radial-gradient(80% 50% at 100% 100%, rgba(8, 40, 24, 0.22) 0%, transparent 50%),
      linear-gradient(165deg, #05070d 0%, #0a0e18 42%, #070c0a 100%);
  }

  .guest-foreground {
    position: relative;
    z-index: 1;
    min-height: 100dvh;
  }

  .full-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: center;
    padding: 48px 24px;
    font-family: var(--font-body);
  }
  .full-center .guest-foreground {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    width: 100%;
  }

  .loader-ring {
    width: 40px; height: 40px;
    border: 2px solid rgba(196, 163, 90, 0.2);
    border-top-color: var(--champagne);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loader-text {
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.04em;
    font-family: var(--font-body);
  }

  .error-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    border: 1px solid var(--champagne-line);
    color: var(--champagne);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
  }
  .error-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--linen);
  }
  .error-msg {
    font-size: 14px;
    line-height: 1.55;
    color: rgba(250, 180, 180, 0.9);
    font-family: var(--font-body);
    max-width: 280px;
  }
  .error-hint {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-faint);
    font-family: var(--font-body);
    max-width: 260px;
  }

  .app-root { position: relative; overflow: hidden; min-height: 100dvh; }

  @keyframes fadeRise {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ══════════════════════════════════════
     WELCOME
  ══════════════════════════════════════ */
  .welcome-screen {
    position: relative;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 22px 48px;
    overflow: hidden;
    font-family: var(--font-body);
    opacity: 0;
    transition: opacity 0.7s var(--ease);
  }
  .welcome-screen.welcome-in { opacity: 1; }

  .welcome-content {
    position: relative;
    z-index: 2;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 360px;
    animation: fadeRise 0.8s var(--ease) both;
  }

  .welcome-logo-container {
    margin-bottom: 8px;
    filter: drop-shadow(0 12px 28px rgba(0,0,0,0.35));
  }

  .welcome-eyebrow {
    margin-top: 8px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--champagne);
  }

  .welcome-divider {
    width: 48px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--champagne), transparent);
    margin: 16px 0 22px;
  }

  .welcome-greeting {
    font-size: 14px;
    font-weight: 300;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .welcome-name {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.05;
    color: var(--linen);
    margin-bottom: 18px;
  }

  .welcome-room-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--champagne-line);
    color: var(--champagne);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 8px 16px;
    border-radius: 999px;
    margin-bottom: 22px;
    background: rgba(196, 163, 90, 0.06);
  }

  .welcome-message {
    font-size: 15px;
    font-weight: 300;
    color: var(--text-muted);
    line-height: 1.65;
    margin-bottom: 28px;
  }

  .welcome-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    max-width: 280px;
    min-height: 52px;
    background: var(--champagne);
    color: var(--ink);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 14px 24px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: transform 0.25s var(--ease), background 0.25s var(--ease), box-shadow 0.25s var(--ease);
    margin-bottom: 16px;
    font-family: var(--font-body);
    box-shadow: 0 10px 28px rgba(196, 163, 90, 0.22);
  }
  .welcome-btn:hover { background: #d4b56a; transform: translateY(-1px); }
  .welcome-btn:active { transform: translateY(0); }

  .welcome-note {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  /* ══════════════════════════════════════
     BILL PAGE
  ══════════════════════════════════════ */
  .bill-page {
    font-family: var(--font-body);
    min-height: 100dvh;
    opacity: 0;
    transition: opacity 0.55s var(--ease);
  }
  .bill-page.bill-in { opacity: 1; }

  .bill-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(11, 16, 28, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(243, 239, 230, 0.08);
    padding: 14px 18px;
    padding-top: max(14px, env(safe-area-inset-top));
  }
  .bill-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: 880px;
    width: calc(100% - 32px);
    margin: 0 auto;
  }
  .bill-brand-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .bill-header-kicker {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--champagne);
    line-height: 1;
  }
  .bill-hotel-label {
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 500;
    color: var(--linen);
    letter-spacing: -0.01em;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bill-room-chip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(243, 239, 230, 0.06);
    border: 1px solid rgba(243, 239, 230, 0.1);
    white-space: nowrap;
  }
  .bill-room-num {
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    color: var(--linen);
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }
  .bill-room-sep {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--champagne);
    opacity: 0.7;
  }
  .bill-room-type {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-muted);
  }

  .bill-body {
    max-width: 880px;
    margin: 0 auto;
    padding: 22px 20px 36px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .welcome-banner {
    background: linear-gradient(145deg, rgba(30, 36, 96, 0.45), rgba(14, 131, 69, 0.12));
    border: 1px solid rgba(196, 163, 90, 0.22);
    border-radius: var(--radius);
    padding: 20px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    animation: fadeRise 0.55s var(--ease) both;
  }
  .wb-eyebrow {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--champagne);
    margin-bottom: 4px;
  }
  .wb-greeting {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 600;
    color: var(--linen);
    line-height: 1.1;
    letter-spacing: 0.01em;
  }
  .wb-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 6px;
    font-weight: 300;
  }
  .wb-nights {
    flex-shrink: 0;
    text-align: center;
    min-width: 68px;
    padding: 10px 12px;
    border-left: 1px solid rgba(196, 163, 90, 0.28);
  }
  .wb-nights-num {
    display: block;
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 600;
    color: var(--linen);
    line-height: 1;
  }
  .wb-nights-label {
    font-size: 10px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin-top: 4px;
    display: block;
  }

  .section-card {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    padding: 18px 16px;
    animation: fadeRise 0.55s var(--ease) both;
  }
  .section-head {
    display: flex;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(196, 163, 90, 0.18);
  }
  .section-title {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--champagne);
  }

  .detail-grid { display: flex; flex-direction: column; }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 11px 0;
    border-bottom: 1px solid rgba(243, 239, 230, 0.06);
    gap: 10px;
  }
  .detail-row:last-child { border-bottom: none; padding-bottom: 0; }
  .detail-row:first-child { padding-top: 0; }
  .detail-label {
    font-size: 13px;
    color: var(--text-faint);
    font-weight: 400;
    white-space: nowrap;
  }
  .detail-value {
    font-size: 14px;
    color: var(--linen);
    font-weight: 500;
    text-align: right;
  }
  .detail-highlight { color: var(--champagne); }

  .line-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid rgba(243, 239, 230, 0.06);
    gap: 10px;
  }
  .line-item:last-of-type { border-bottom: none; }
  .line-left { flex: 1; min-width: 0; }
  .line-name {
    font-size: 14px;
    color: var(--linen);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .line-meta {
    font-size: 12px;
    color: var(--text-faint);
    margin-top: 3px;
    line-height: 1.4;
  }
  .line-amount {
    font-size: 14px;
    color: var(--linen);
    font-weight: 600;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .subtotal-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0 0;
    margin-top: 6px;
    border-top: 1px solid rgba(196, 163, 90, 0.2);
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .subtotal-accent {
    color: var(--champagne);
    border-top: none;
    padding-top: 6px;
    margin-top: 0;
  }

  .total-card {
    background:
      linear-gradient(155deg, rgba(30, 36, 96, 0.75) 0%, rgba(14, 21, 36, 0.95) 55%, rgba(14, 131, 69, 0.28) 140%);
    border: 1px solid var(--champagne-line);
    border-radius: 16px;
    padding: 22px 18px;
    animation: fadeRise 0.55s var(--ease) both;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  }
  .total-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .total-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--champagne);
  }
  .total-bill-id {
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 4px;
    letter-spacing: 0.04em;
  }
  .total-status-chip {
    border: 1px solid rgba(14, 131, 69, 0.45);
    background: rgba(14, 131, 69, 0.15);
    color: #8fd6ad;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 6px 10px;
    border-radius: 999px;
  }
  .total-amount {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 14px;
  }
  .total-currency {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 0.06em;
  }
  .total-number {
    font-family: var(--font-display);
    font-size: 46px;
    font-weight: 600;
    color: var(--linen);
    letter-spacing: 0.01em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .total-note {
    font-size: 12px;
    color: var(--text-faint);
    line-height: 1.5;
    border-top: 1px solid rgba(196, 163, 90, 0.2);
    padding-top: 12px;
  }

  .no-bill-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 56px 22px 40px;
    text-align: center;
    animation: fadeRise 0.65s var(--ease) both;
    min-height: calc(100dvh - 180px);
  }
  .no-bill-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 1px solid var(--champagne-line);
    color: var(--champagne);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
    background: rgba(196, 163, 90, 0.06);
  }
  .no-bill-eyebrow {
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--champagne);
    margin-bottom: 10px;
  }
  .no-bill-title {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--linen);
    margin-bottom: 12px;
  }
  .no-bill-sub {
    font-size: 15px;
    font-weight: 300;
    color: var(--text-muted);
    line-height: 1.65;
    max-width: 290px;
  }

  .bill-footer {
    text-align: center;
    padding: 28px 22px 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .footer-hotel {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    color: var(--linen-soft);
  }
  .footer-sub {
    font-size: 12px;
    color: var(--text-faint);
    line-height: 1.45;
  }
  .footer-phone {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  }
  .footer-phone svg { opacity: 0.65; }
  .footer-tagline {
    font-size: 12px;
    color: var(--text-faint);
    margin-top: 14px;
    letter-spacing: 0.04em;
  }

  .cta-row,
  .cta-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }
  .cta-stack { max-width: 320px; margin-top: 28px; }
  .cta-stack-bill { max-width: none; margin-top: 4px; }

  .cta-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-radius: 4px;
    padding: 14px 18px;
    min-height: 52px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    text-decoration: none;
    border: none;
    transition: transform 0.2s var(--ease), background 0.2s var(--ease), border-color 0.2s var(--ease);
    -webkit-tap-highlight-color: transparent;
    font-family: var(--font-body);
  }
  .cta-btn:active { transform: scale(0.985); }

  .cta-call-btn {
    background: var(--champagne);
    color: var(--ink);
    box-shadow: 0 10px 24px rgba(196, 163, 90, 0.18);
  }
  .cta-call-btn:hover { background: #d4b56a; }

  .cta-feedback-btn {
    background: transparent;
    color: var(--linen);
    border: 1px solid rgba(243, 239, 230, 0.22);
  }
  .cta-feedback-btn:hover {
    border-color: var(--champagne-line);
    color: var(--champagne);
  }

  /* ══════════════════════════════════════
     FEEDBACK MODAL
  ══════════════════════════════════════ */
  .fb-overlay {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    background: rgba(6, 10, 18, 0.78);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 9999;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    margin: 0;
    animation: fbOverlayIn 0.25s var(--ease);
  }
  @keyframes fbOverlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .fb-modal {
    position: relative;
    background: linear-gradient(180deg, #182338 0%, #101827 100%);
    border: 1px solid rgba(196, 163, 90, 0.22);
    border-radius: 20px 20px 0 0;
    padding: 22px 18px 36px;
    width: 100%;
    max-width: 440px;
    box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.4);
    animation: fbSlideUp 0.34s var(--ease);
    font-family: var(--font-body);
  }
  .fb-modal::before {
    content: '';
    display: block;
    width: 40px;
    height: 3px;
    border-radius: 3px;
    background: rgba(196, 163, 90, 0.35);
    margin: 0 auto 18px;
  }
  @keyframes fbSlideUp {
    from { transform: translateY(100%); opacity: 0.85; }
    to   { transform: translateY(0); opacity: 1; }
  }

  .fb-close {
    position: absolute;
    top: 16px; right: 14px;
    background: rgba(243, 239, 230, 0.06);
    border: 1px solid rgba(243, 239, 230, 0.1);
    border-radius: 50%;
    width: 36px; height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.15s var(--ease), border-color 0.15s var(--ease);
  }
  .fb-close:hover { color: var(--linen); border-color: var(--champagne-line); }

  .fb-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
    padding-right: 36px;
  }
  .fb-header-icon {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid var(--champagne-line);
    color: var(--champagne);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(196, 163, 90, 0.08);
  }
  .fb-title {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    color: var(--linen);
    letter-spacing: 0.01em;
    margin-bottom: 2px;
  }
  .fb-subtitle {
    font-size: 12px;
    color: var(--text-faint);
    letter-spacing: 0.04em;
  }

  .fb-stars-label,
  .fb-chips-label,
  .fb-msg-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--champagne);
    margin-bottom: 10px;
  }
  .fb-stars {
    display: flex;
    gap: 2px;
    margin-bottom: 4px;
  }
  .fb-star {
    font-size: 30px;
    background: none;
    border: none;
    color: rgba(243, 239, 230, 0.16);
    cursor: pointer;
    transition: color 0.12s var(--ease), transform 0.12s var(--ease);
    line-height: 1;
    padding: 4px;
    min-width: 44px;
    min-height: 44px;
    -webkit-tap-highlight-color: transparent;
  }
  .fb-star.fb-star-on { color: var(--champagne); }
  .fb-star:active { transform: scale(1.12); }

  .fb-rating-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--champagne);
    min-height: 1.2em;
    margin-bottom: 18px;
  }
  .fb-rating-hint { color: var(--text-faint); font-weight: 400; }

  .fb-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
  }
  .fb-chip {
    background: rgba(243, 239, 230, 0.04);
    border: 1px solid rgba(243, 239, 230, 0.12);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    padding: 8px 12px;
    min-height: 36px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.15s var(--ease);
    font-family: var(--font-body);
  }
  .fb-chip.fb-chip-on {
    background: rgba(196, 163, 90, 0.12);
    border-color: var(--champagne-line);
    color: var(--champagne);
  }

  .fb-textarea {
    width: 100%;
    background: rgba(243, 239, 230, 0.04);
    border: 1px solid rgba(243, 239, 230, 0.12);
    border-radius: 10px;
    color: var(--linen);
    font-size: 14px;
    padding: 12px 14px;
    resize: none;
    outline: none;
    font-family: var(--font-body);
    transition: border-color 0.15s var(--ease);
    margin-bottom: 4px;
  }
  .fb-textarea:focus { border-color: var(--champagne-line); }
  .fb-textarea::placeholder { color: rgba(243, 239, 230, 0.28); }

  .fb-char-count {
    font-size: 11px;
    color: var(--text-faint);
    text-align: right;
    margin-bottom: 18px;
  }

  .fb-submit {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--champagne);
    color: var(--ink);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 14px;
    min-height: 52px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s var(--ease), background 0.15s var(--ease);
    font-family: var(--font-body);
  }
  .fb-submit:hover { background: #d4b56a; }
  .fb-submit:active { transform: scale(0.985); }
  .fb-submit.fb-submit-disabled { opacity: 0.38; cursor: not-allowed; }

  .fb-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(14, 21, 36, 0.25);
    border-top-color: var(--ink);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .fb-thankyou {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 12px 0 4px;
    gap: 12px;
    animation: fbFadeIn 0.4s var(--ease);
  }
  @keyframes fbFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fb-ty-icon {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    border: 1px solid var(--champagne-line);
    color: var(--champagne);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(196, 163, 90, 0.08);
  }
  .fb-ty-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 600;
    color: var(--linen);
  }
  .fb-ty-sub {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
    font-weight: 300;
  }
  .fb-done-btn {
    margin-top: 6px;
    background: var(--champagne);
    border: none;
    color: var(--ink);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 14px 28px;
    min-height: 48px;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-body);
  }

  /* ══════════════════════════════════════
     SESSION TIMER BAR
  ══════════════════════════════════════ */
  .session-timer-bar {
    position: fixed;
    top: 12px;
    right: 16px;
    left: auto;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 6px 10px;
    padding-top: max(6px, env(safe-area-inset-top));
    background: rgba(6, 10, 18, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(196, 163, 90, 0.12);
    border-radius: 999px;
    font-family: var(--font-body);
    transition: transform 0.18s var(--ease), background 0.25s var(--ease);
    pointer-events: auto;
    box-shadow: 0 6px 20px rgba(0,0,0,0.45);
  }
  .session-timer-bar svg {
    color: var(--champagne);
    opacity: 0.7;
    flex-shrink: 0;
  }
  /* Hide the verbose label to keep the timer compact */
  .session-timer-label { display: none; }
  .session-timer-count {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--champagne);
    font-variant-numeric: tabular-nums;
    min-width: 38px;
    text-align: right;
  }
  .session-timer-urgent {
    background: rgba(40, 6, 6, 0.72);
    border-bottom-color: rgba(220, 80, 80, 0.3);
  }
  .session-timer-urgent svg { color: #f87171; }
  .session-timer-urgent .session-timer-count {
    color: #f87171;
    animation: timerPulse 1s ease-in-out infinite;
  }
  @keyframes timerPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }

  /* ══════════════════════════════════════
     SESSION EXPIRED SCREEN
  ══════════════════════════════════════ */
  .expired-screen {
    position: relative;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 22px 56px;
    font-family: var(--font-body);
    opacity: 0;
    transition: opacity 0.6s var(--ease);
  }
  .expired-screen.expired-in { opacity: 1; }

  .expired-content {
    position: relative;
    z-index: 2;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 320px;
    animation: fadeRise 0.75s var(--ease) both;
  }

  .expired-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 1px solid rgba(248, 113, 113, 0.4);
    background: rgba(248, 113, 113, 0.08);
    color: #f87171;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }

  .expired-eyebrow {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #f87171;
    opacity: 0.75;
    margin-bottom: 10px;
  }

  .expired-title {
    font-family: var(--font-display);
    font-size: 44px;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.05;
    color: var(--linen);
    margin-bottom: 14px;
  }

  .expired-sub {
    font-size: 15px;
    font-weight: 300;
    color: var(--text-muted);
    line-height: 1.65;
    max-width: 270px;
    margin-bottom: 20px;
  }

  .expired-divider {
    width: 40px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(196, 163, 90, 0.5), transparent);
    margin-bottom: 20px;
  }

  .expired-instruction {
    font-size: 14px;
    color: var(--text-faint);
    line-height: 1.6;
    max-width: 250px;
    margin-bottom: 28px;
  }

  .expired-qr-icon {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--champagne-line);
    color: var(--champagne);
    background: rgba(196, 163, 90, 0.07);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 12px 20px;
    border-radius: 999px;
  }

  @media (min-width: 480px) {
    .welcome-name { font-size: 56px; }
    .total-number { font-size: 52px; }
    .bill-body { padding: 22px 22px 36px; gap: 16px; }
    .fb-modal {
      border-radius: 18px;
      margin-bottom: 18px;
    }
    .fb-overlay {
      align-items: center;
      padding: 24px;
    }
    .expired-title { font-size: 52px; }
  }
`;
