'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
      {/* Animated blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="welcome-content">
        {/* 3D Animated Brand Logo */}
        <div className="welcome-logo-container mb-3">
          <Logo size={180} showText={true} useBrandColors={true} animated3D={true} />
        </div>

        <p className="welcome-hotel-name">{hotelName}</p>

        <div className="welcome-divider" />

        <p className="welcome-greeting">{getGreeting()},</p>
        <h1 className="welcome-name">{firstName(guestName)} 👋</h1>

        <div className="welcome-room-tag">
          <span className="room-tag-dot" />
          Room {roomNumber}
        </div>

        <p className="welcome-message">
          We&apos;re delighted to have you with us.<br />
          Here&apos;s a live summary of your bill — <br />
          updated in real time.
        </p>

        <button className="welcome-btn" onClick={onContinue}>
          <span>View My Bill</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        <p className="welcome-note">No login required · Secure &amp; read-only</p>
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

  return (
    <div className="fb-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fb-modal">
        {/* Close */}
        <button className="fb-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {submitted ? (
          /* ── Thank you state ── */
          <div className="fb-thankyou">
            <div className="fb-ty-icon">🎉</div>
            <h3 className="fb-ty-title">Thank You!</h3>
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
              <div className="fb-header-icon">💬</div>
              <div>
                <h3 className="fb-title">Share Your Feedback</h3>
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
              {rating === 1 && '😞 Poor'}
              {rating === 2 && '😕 Fair'}
              {rating === 3 && '🙂 Good'}
              {rating === 4 && '😊 Very Good'}
              {rating === 5 && '🤩 Excellent!'}
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
    </div>
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
        <div className="bill-header">
          <div className="bill-header-inner">
            <p className="bill-hotel-label">{settings.hotelName}</p>
            <div className="bill-room-chip">Room {room.roomNumber} · {room.roomType}</div>
          </div>
        </div>
        <div className="no-bill-wrap">
          <div className="no-bill-icon">🏨</div>
          <h2 className="no-bill-title">No Active Bill</h2>
          <p className="no-bill-sub">
            This room currently has no open billing session.<br />
            Please contact our front desk for assistance.
          </p>
          <div className="cta-row" style={{ gap: '0.75rem', marginTop: '1.25rem' }}>
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="cta-btn cta-call-btn">
                📞 Call Front Desk
              </a>
            )}
            <button
              type="button"
              className="cta-btn cta-feedback-btn"
              onClick={() => setShowFeedback(true)}
            >
              💬 Give Feedback
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
      {/* ── Sticky Header ── */}
      <div className="bill-header">
        <div className="bill-header-inner">
          <div>
            <p className="bill-hotel-label">{settings.hotelName}</p>
            <p className="bill-header-sub">{settings.address}</p>
          </div>
          <div className="bill-room-chip">Room {room.roomNumber}</div>
        </div>
      </div>

      <div className="bill-body">

        {/* ── Welcome Banner ── */}
        <div className="welcome-banner">
          <div className="wb-left">
            <p className="wb-greeting">{getGreeting()}, <strong>{firstName(guestDetails.name)}</strong> 👋</p>
            <p className="wb-sub">Here&apos;s your current bill summary</p>
          </div>
          <div className="wb-nights">
            <span className="wb-nights-num">{nights}</span>
            <span className="wb-nights-label">Night{nights !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ── Guest Card ── */}
        <div className="section-card">
          <div className="section-head">
            <span className="section-icon">👤</span>
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
              <span className="section-icon">🏠</span>
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
              <span className="section-icon">🍽️</span>
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
              <p className="total-label">Total Amount Due</p>
              <p className="total-bill-id">Bill #{bill.id}</p>
            </div>
            <div className="total-status-chip">Active</div>
          </div>
          <div className="total-amount">
            <span className="total-currency">{currency}</span>
            <span className="total-number">{totalAmount.toLocaleString()}</span>
          </div>
          <p className="total-note">
            ℹ️ This is a live preview. Final amount may vary at checkout.
          </p>
        </div>

        {/* ── Action Buttons Row ── */}
        <div className="cta-row">
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="cta-btn cta-call-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.18 2 2 0 012.22 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <span>Call Front Desk</span>
            </a>
          )}
          <button className="cta-btn cta-feedback-btn" onClick={() => setShowFeedback(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>Give Feedback</span>
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
      {settings.phone && <p className="footer-sub">📞 {settings.phone}</p>}
      <p className="footer-tagline">Thank you for choosing us. We hope you enjoy your stay! 🌟</p>
    </footer>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type AppState = 'loading' | 'error' | 'welcome' | 'bill';

export default function RoomQRCodePage() {
  const { roomNumber } = useParams<{ roomNumber: string }>();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    if (!roomNumber) return;
    fetch(`/api/guest/room/${encodeURIComponent(roomNumber)}`)
      .then((r) => r.json())
      .then((json: ApiResponse & { error?: string }) => {
        if (json.error) {
          setFetchError(json.error);
          setAppState('error');
        } else {
          setData(json);
          setAppState(json.bill && json.room.status === 'Occupied' ? 'welcome' : 'bill');
        }
      })
      .catch(() => {
        setFetchError('Unable to reach the server. Please try again.');
        setAppState('error');
      });
  }, [roomNumber]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <div className="full-center gradient-bg">
        <div className="loader-ring" />
        <p className="loader-text">Loading your bill…</p>
        <style>{BASE_CSS}</style>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (appState === 'error' || !data) {
    return (
      <div className="full-center gradient-bg">
        <div className="error-emoji">⚠️</div>
        <p className="error-title">Oops!</p>
        <p className="error-msg">{fetchError ?? 'Something went wrong.'}</p>
        <p className="error-hint">Please contact our front desk for assistance.</p>
        <style>{BASE_CSS}</style>
      </div>
    );
  }

  // ── Welcome → Bill ───────────────────────────────────────────────────────
  return (
    <div className="app-root gradient-bg">
      {appState === 'welcome' && data.bill && (
        <WelcomeScreen
          hotelName={data.settings.hotelName}
          roomNumber={data.room.roomNumber}
          guestName={data.bill.guestDetails.name}
          onContinue={() => setAppState('bill')}
        />
      )}
      {appState === 'bill' && <BillPage data={data} />}
      <style>{BASE_CSS}</style>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #0f0c29; }

  .gradient-bg {
    min-height: 100dvh;
    background: linear-gradient(160deg, #1a1042 0%, #2d1b69 40%, #11998e 100%);
  }

  /* ── Full-center (loading / error) ── */
  .full-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }

  /* ── Loader ── */
  .loader-ring {
    width: 52px; height: 52px;
    border: 4px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.85s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loader-text { color: rgba(255,255,255,0.75); font-size: 0.9rem; font-family: system-ui, sans-serif; }

  /* ── Error ── */
  .error-emoji { font-size: 3.5rem; }
  .error-title { font-size: 1.4rem; font-weight: 700; color: #fff; font-family: system-ui, sans-serif; }
  .error-msg { font-size: 0.9rem; color: #fca5a5; font-family: system-ui, sans-serif; max-width: 280px; }
  .error-hint { font-size: 0.8rem; color: rgba(255,255,255,0.55); font-family: system-ui, sans-serif; max-width: 260px; line-height: 1.5; }

  /* ── App root ── */
  .app-root { position: relative; overflow: hidden; }

  /* ══════════════════════════════════════
     WELCOME SCREEN
  ══════════════════════════════════════ */
  .welcome-screen {
    position: relative;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.25rem;
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .welcome-screen.welcome-in { opacity: 1; transform: translateY(0); }

  /* Animated blobs */
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.35;
    animation: blobFloat 7s ease-in-out infinite alternate;
    pointer-events: none;
  }
  .blob-1 { width: 320px; height: 320px; background: #7c3aed; top: -80px; left: -100px; animation-delay: 0s; }
  .blob-2 { width: 260px; height: 260px; background: #0891b2; bottom: -60px; right: -80px; animation-delay: 2s; }
  .blob-3 { width: 200px; height: 200px; background: #10b981; bottom: 120px; left: 30%; animation-delay: 4s; }
  @keyframes blobFloat {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(20px, -20px) scale(1.08); }
  }

  .welcome-content {
    position: relative;
    z-index: 2;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    width: 100%;
    max-width: 360px;
  }

  .hotel-logo {
    width: 72px; height: 72px;
    margin-bottom: 1.1rem;
    animation: logoIn 0.7s cubic-bezier(.34,1.56,.64,1) both;
    animation-delay: 0.2s;
  }
  @keyframes logoIn {
    from { transform: scale(0.5) rotate(-10deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  .hotel-logo svg { width: 100%; height: 100%; }

  .welcome-hotel-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.3px;
    margin-bottom: 0.75rem;
  }

  .welcome-divider {
    width: 36px; height: 3px;
    background: linear-gradient(90deg, #7c3aed, #10b981);
    border-radius: 2px;
    margin-bottom: 1.25rem;
  }

  .welcome-greeting {
    font-size: 1rem;
    color: rgba(255,255,255,0.65);
    margin-bottom: 0.2rem;
  }

  .welcome-name {
    font-size: 2.2rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -1px;
    line-height: 1.15;
    margin-bottom: 1rem;
  }

  .welcome-room-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    margin-bottom: 1.4rem;
    backdrop-filter: blur(8px);
  }
  .room-tag-dot {
    width: 7px; height: 7px;
    background: #10b981;
    border-radius: 50%;
    box-shadow: 0 0 6px #10b981;
    animation: pulse-dot 1.8s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.5; transform: scale(1.4); }
  }

  .welcome-message {
    font-size: 0.88rem;
    color: rgba(255,255,255,0.65);
    line-height: 1.7;
    margin-bottom: 2rem;
  }

  .welcome-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
    padding: 0.85rem 2rem;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    box-shadow: 0 8px 28px rgba(124,58,237,0.45);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    margin-bottom: 1rem;
    letter-spacing: 0.2px;
  }
  .welcome-btn:active { transform: scale(0.96); box-shadow: 0 4px 16px rgba(124,58,237,0.35); }

  .welcome-note {
    font-size: 0.72rem;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.3px;
  }

  /* ══════════════════════════════════════
     BILL PAGE
  ══════════════════════════════════════ */
  .bill-page {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    min-height: 100dvh;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .bill-page.bill-in { opacity: 1; transform: translateY(0); }

  /* ── Sticky header ── */
  .bill-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(17,8,60,0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 0.75rem 1rem;
  }
  .bill-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    max-width: 480px;
    margin: 0 auto;
  }
  .bill-hotel-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bill-header-sub {
    font-size: 0.68rem;
    color: rgba(255,255,255,0.45);
    margin-top: 0.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }
  .bill-room-chip {
    flex-shrink: 0;
    background: rgba(124,58,237,0.25);
    border: 1px solid rgba(124,58,237,0.5);
    color: #c4b5fd;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    white-space: nowrap;
  }

  /* ── Body ── */
  .bill-body {
    max-width: 480px;
    margin: 0 auto;
    padding: 1rem 0.85rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  /* ── Welcome banner ── */
  .welcome-banner {
    background: linear-gradient(135deg, rgba(124,58,237,0.3), rgba(16,185,129,0.2));
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 18px;
    padding: 1.1rem 1.15rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    backdrop-filter: blur(8px);
  }
  .wb-greeting {
    font-size: 1rem;
    color: #fff;
    font-weight: 500;
  }
  .wb-greeting strong { font-weight: 800; }
  .wb-sub {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.55);
    margin-top: 0.25rem;
  }
  .wb-nights {
    flex-shrink: 0;
    text-align: center;
    background: rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 0.55rem 0.85rem;
  }
  .wb-nights-num {
    display: block;
    font-size: 1.6rem;
    font-weight: 800;
    color: #fff;
    line-height: 1;
  }
  .wb-nights-label {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* ── Section card ── */
  .section-card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 18px;
    padding: 1rem 1.1rem;
    backdrop-filter: blur(8px);
  }
  .section-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.85rem;
  }
  .section-icon { font-size: 1rem; }
  .section-title {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #a78bfa;
  }

  /* ── Detail rows ── */
  .detail-grid { display: flex; flex-direction: column; gap: 0; }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    gap: 0.5rem;
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-label {
    font-size: 0.78rem;
    color: rgba(255,255,255,0.4);
    font-weight: 500;
    white-space: nowrap;
  }
  .detail-value {
    font-size: 0.82rem;
    color: rgba(255,255,255,0.9);
    font-weight: 600;
    text-align: right;
  }
  .detail-highlight { color: #6ee7b7; }

  /* ── Line items ── */
  .line-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.55rem 0;
    border-bottom: 1px dashed rgba(255,255,255,0.06);
    gap: 0.5rem;
  }
  .line-item:last-of-type { border-bottom: none; }
  .line-left { flex: 1; min-width: 0; }
  .line-name {
    font-size: 0.83rem;
    color: rgba(255,255,255,0.9);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .line-meta {
    font-size: 0.71rem;
    color: rgba(255,255,255,0.35);
    margin-top: 0.15rem;
  }
  .line-amount {
    font-size: 0.83rem;
    color: #fff;
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── Subtotal rows ── */
  .subtotal-row {
    display: flex;
    justify-content: space-between;
    padding: 0.55rem 0 0;
    margin-top: 0.3rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    font-size: 0.8rem;
    color: rgba(255,255,255,0.65);
    font-weight: 600;
  }
  .subtotal-accent {
    color: #6ee7b7;
    border-top: none;
    padding-top: 0.25rem;
  }

  /* ── Total card ── */
  .total-card {
    background: linear-gradient(135deg, #7c3aed 0%, #4338ca 60%, #0e7490 100%);
    border-radius: 20px;
    padding: 1.4rem 1.25rem;
    box-shadow: 0 12px 40px rgba(124,58,237,0.4);
  }
  .total-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.85rem;
  }
  .total-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255,255,255,0.7);
  }
  .total-bill-id {
    font-size: 0.68rem;
    color: rgba(255,255,255,0.45);
    margin-top: 0.2rem;
  }
  .total-status-chip {
    background: rgba(16,185,129,0.25);
    border: 1px solid rgba(16,185,129,0.5);
    color: #6ee7b7;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    letter-spacing: 0.5px;
  }
  .total-amount {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }
  .total-currency {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
  }
  .total-number {
    font-size: 2.6rem;
    font-weight: 900;
    color: #fff;
    letter-spacing: -1.5px;
    line-height: 1;
  }
  .total-note {
    font-size: 0.71rem;
    color: rgba(255,255,255,0.5);
    line-height: 1.5;
    border-top: 1px solid rgba(255,255,255,0.15);
    padding-top: 0.75rem;
  }

  /* ── CTA call button ── */
  .cta-call {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    padding: 0.85rem;
    color: rgba(255,255,255,0.75);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.18s ease;
  }
  .cta-call:active { background: rgba(255,255,255,0.12); }

  /* ── Call button (no bill) ── */
  .call-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
    border-radius: 999px;
    text-decoration: none;
  }

  /* ── No bill ── */
  .no-bill-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1.5rem;
    text-align: center;
  }
  .no-bill-icon { font-size: 4rem; margin-bottom: 1rem; }
  .no-bill-title { font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; }
  .no-bill-sub { font-size: 0.85rem; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 260px; }

  /* ── Footer ── */
  .bill-footer {
    text-align: center;
    padding: 2rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }
  .footer-hotel { font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.6); }
  .footer-sub { font-size: 0.72rem; color: rgba(255,255,255,0.35); }
  .footer-tagline { font-size: 0.78rem; color: rgba(255,255,255,0.45); margin-top: 0.5rem; line-height: 1.5; }

  /* ── Action button row ── */
  .cta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
  }
  .cta-row:has(.cta-call-btn:only-child),
  .cta-row > :only-child {
    grid-column: 1 / -1;
  }
  .cta-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 14px;
    padding: 0.9rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    border: none;
    transition: transform 0.15s ease, opacity 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .cta-btn:active { transform: scale(0.96); opacity: 0.85; }

  .cta-call-btn {
    background: linear-gradient(135deg, #0891b2, #0e7490);
    color: #fff;
    box-shadow: 0 6px 20px rgba(8,145,178,0.35);
  }
  .cta-feedback-btn {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    box-shadow: 0 6px 20px rgba(124,58,237,0.35);
  }

  /* ══════════════════════════════════════
     FEEDBACK MODAL
  ══════════════════════════════════════ */
  .fb-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 100;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fbOverlayIn 0.25s ease;
  }
  @keyframes fbOverlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .fb-modal {
    position: relative;
    background: #1a1040;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 26px 26px 0 0;
    padding: 1.5rem 1.25rem 2.5rem;
    width: 100%;
    max-width: 480px;
    animation: fbSlideUp 0.32s cubic-bezier(.34,1.4,.64,1);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  @keyframes fbSlideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }

  .fb-close {
    position: absolute;
    top: 1rem; right: 1rem;
    background: rgba(255,255,255,0.08);
    border: none;
    border-radius: 50%;
    width: 34px; height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: background 0.15s;
  }
  .fb-close:hover { background: rgba(255,255,255,0.14); }

  .fb-header {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-bottom: 1.25rem;
  }
  .fb-header-icon {
    font-size: 1.8rem;
    line-height: 1;
  }
  .fb-title {
    font-size: 1.05rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 0.15rem;
  }
  .fb-subtitle {
    font-size: 0.72rem;
    color: rgba(255,255,255,0.4);
  }

  /* Stars */
  .fb-stars-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 0.6rem;
  }
  .fb-stars {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
  }
  .fb-star {
    font-size: 2rem;
    background: none;
    border: none;
    color: rgba(255,255,255,0.18);
    cursor: pointer;
    transition: color 0.12s ease, transform 0.12s ease;
    line-height: 1;
    padding: 0.1rem;
    -webkit-tap-highlight-color: transparent;
  }
  .fb-star.fb-star-on { color: #f59e0b; }
  .fb-star:active { transform: scale(1.25); }

  .fb-rating-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #f59e0b;
    min-height: 1.2em;
    margin-bottom: 1rem;
  }
  .fb-rating-hint { color: rgba(255,255,255,0.3); }

  /* Chips */
  .fb-chips-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 0.5rem;
  }
  .fb-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 1rem;
  }
  .fb-chip {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.6);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .fb-chip.fb-chip-on {
    background: rgba(124,58,237,0.35);
    border-color: #7c3aed;
    color: #c4b5fd;
  }

  /* Textarea */
  .fb-msg-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 0.5rem;
  }
  .fb-textarea {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #fff;
    font-size: 0.85rem;
    padding: 0.75rem 0.9rem;
    resize: none;
    outline: none;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    transition: border-color 0.15s;
    margin-bottom: 0.25rem;
  }
  .fb-textarea:focus { border-color: rgba(124,58,237,0.6); }
  .fb-textarea::placeholder { color: rgba(255,255,255,0.25); }

  .fb-char-count {
    font-size: 0.68rem;
    color: rgba(255,255,255,0.25);
    text-align: right;
    margin-bottom: 1rem;
  }

  /* Submit */
  .fb-submit {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: #fff;
    font-size: 0.92rem;
    font-weight: 700;
    padding: 0.9rem;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    box-shadow: 0 6px 22px rgba(124,58,237,0.4);
    transition: opacity 0.15s, transform 0.15s;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .fb-submit:active { transform: scale(0.97); }
  .fb-submit.fb-submit-disabled { opacity: 0.45; cursor: not-allowed; }

  .fb-spinner {
    width: 20px; height: 20px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* Thank you */
  .fb-thankyou {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem 0 0.5rem;
    gap: 0.75rem;
    animation: fbFadeIn 0.4s ease;
  }
  @keyframes fbFadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  .fb-ty-icon { font-size: 3.5rem; }
  .fb-ty-title { font-size: 1.4rem; font-weight: 800; color: #fff; }
  .fb-ty-sub { font-size: 0.85rem; color: rgba(255,255,255,0.55); line-height: 1.6; }
  .fb-done-btn {
    margin-top: 0.5rem;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.18);
    color: #fff;
    font-size: 0.88rem;
    font-weight: 700;
    padding: 0.65rem 2rem;
    border-radius: 999px;
    cursor: pointer;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }

  /* ── Responsive tweaks ── */
  @media (min-width: 480px) {
    .welcome-name { font-size: 2.6rem; }
    .total-number { font-size: 3rem; }
    .bill-body { padding: 1.25rem 1.25rem 2.5rem; }
    .fb-modal { border-radius: 26px; margin-bottom: 1rem; }
  }
`;
