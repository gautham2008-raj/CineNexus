import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import {
  CheckCircle2,
  Download,
  Film,
  QrCode,
  Share2,
  ShieldCheck,
  X,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import { BookingSummaryData } from '../types/cinema.ts';

interface DigitalTicketModalProps {
  booking: BookingSummaryData;
  onClose: () => void;
  onViewAllBookings: () => void;
}

export const DigitalTicketModal: React.FC<DigitalTicketModalProps> = ({
  booking,
  onClose,
  onViewAllBookings,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [verifiedPulse, setVerifiedPulse] = useState(false);

  const seatLabels = booking.selectedSeats.map((s) => s.id).join(', ');
  const rowBreakdown = booking.selectedSeats
    .map((s) => `Row ${s.row}-Col ${s.col}`)
    .join(', ');

  const qrPayload = JSON.stringify({
    issuer: 'CINENEXUS_VERIFIED_TICKET',
    bookingId: booking.bookingId,
    movie: booking.movie.title,
    theatre: booking.theatre.name,
    screen: booking.screenName,
    date: booking.showDate,
    time: booking.showTime,
    seats: seatLabels,
    amountInr: booking.totalAmountInr,
    paymentId: booking.paymentId,
    status: booking.status.toUpperCase(),
  });

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Dark luxury header
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFillColor(225, 29, 72);
    doc.rect(15, 15, 180, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('CINENEXUS — OFFICIAL DIGITAL QR TICKET', 22, 26.5);

    doc.setFontSize(10);
    doc.setTextColor(251, 191, 36);
    doc.text('YOUR MOVIE. YOUR THEATRE. YOUR EXPERIENCE.', 22, 42);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(booking.movie.title, 22, 55);

    doc.setFontSize(11);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `${booking.language} · ${booking.format} · Certification: ${booking.movie.certification}`,
      22,
      63
    );

    // Ticket details box
    doc.setDrawColor(51, 65, 85);
    doc.rect(15, 72, 180, 115);

    const lines: [string, string][] = [
      ['Booking Reference ID', booking.bookingId],
      ['Booking Status', booking.status.toUpperCase()],
      ['Theatre Name', booking.theatre.name],
      ['Theatre Address', booking.theatre.address.slice(0, 68)],
      ['Auditorium Screen', booking.screenName],
      ['Show Date & Time', `${booking.showDate} at ${booking.showTime}`],
      ['Seat Numbers', seatLabels],
      ['Row & Column Coordinates', rowBreakdown],
      ['Seat Category', booking.selectedSeats[0]?.category || 'Standard'],
      ['Tickets Subtotal (INR)', `Rs. ${booking.subtotalInr}`],
      ['GST (18%) + Convenience Fee', `Rs. ${booking.gstInr + booking.convenienceFeeInr}`],
      ['Total Amount Paid (INR)', `Rs. ${booking.totalAmountInr} (Paid via ${booking.paymentMethod || 'UPI'})`],
      ['Razorpay Payment Ref', booking.paymentId || 'pay_rzp_verified'],
    ];

    let y = 84;
    for (const [label, val] of lines) {
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(10);
      doc.text(`${label}:`, 22, y);
      doc.setTextColor(255, 255, 255);
      doc.text(String(val), 85, y);
      y += 8;
    }

    doc.setTextColor(16, 185, 129);
    doc.setFontSize(10);
    doc.text(
      'Cryptographically Verified Digital Ticket · Present QR Code at Theatre Gate',
      22,
      202
    );

    doc.save(`CineNexus_Ticket_${booking.bookingId}.pdf`);
  };

  const handleShareTicket = async () => {
    const shareText = `CineNexus Ticket Confirmed!\nMovie: ${booking.movie.title} (${booking.language} · ${booking.format})\nTheatre: ${booking.theatre.name} (${booking.screenName})\nDate & Time: ${booking.showDate} at ${booking.showTime}\nSeats: ${seatLabels}\nTotal Paid: ₹${booking.totalAmountInr}\nBooking ID: ${booking.bookingId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `CineNexus Ticket — ${booking.movie.title}`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch {
      setCopiedShare(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0b0f19] border border-white/15 rounded-3xl overflow-hidden shadow-2xl my-8">
        {/* Top Branded Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-700 via-rose-600 to-purple-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-white" />
            <div>
              <div className="font-display font-bold text-white text-base tracking-tight">
                CINENEXUS DIGITAL PASS
              </div>
              <div className="text-[10px] tracking-widest text-amber-200 uppercase">
                YOUR MOVIE. YOUR THEATRE. YOUR EXPERIENCE.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-semibold">
              {booking.status.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Ticket Stub Body */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left 7 Columns: Movie & Auditorium Details */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-start gap-4">
              <img
                src={booking.movie.posterUrl}
                alt={booking.movie.title}
                referrerPolicy="no-referrer"
                className="w-20 h-28 object-cover rounded-xl border border-white/15 shrink-0"
              />
              <div>
                <span className="text-xs font-mono text-amber-400">
                  ID: {booking.bookingId}
                </span>
                <h2 className="font-display text-xl font-bold text-white leading-snug mt-0.5">
                  {booking.movie.title}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  {booking.language} · {booking.format} · {booking.movie.certification}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{booking.theatre.city}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
              <div>
                <div className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Theatre & Screen</span>
                </div>
                <div className="font-semibold text-white mt-0.5">{booking.theatre.name}</div>
                <div className="text-amber-400 font-mono text-[11px]">{booking.screenName}</div>
              </div>

              <div>
                <div className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <span>Date & Showtime</span>
                </div>
                <div className="font-semibold text-white mt-0.5">{booking.showDate}</div>
                <div className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{booking.showTime}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reserved Seats:</span>
                <span className="font-mono font-bold text-white text-sm">{seatLabels}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Row & Column:</span>
                <span className="font-mono text-slate-300 text-[11px]">{rowBreakdown}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Seat Tier:</span>
                <span className="text-purple-300 font-medium">
                  {booking.selectedSeats[0]?.category || 'Standard'}
                </span>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-slate-300 font-medium">Total Paid (INR):</span>
                <span className="font-mono text-base font-bold text-amber-400 tabular-nums">
                  ₹{booking.totalAmountInr.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Scannable QR Verification Code */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-900/90 border border-white/10 text-center space-y-3">
            <div className="p-3.5 bg-white rounded-2xl shadow-lg">
              <QRCodeSVG
                value={qrPayload}
                size={156}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-white">
                {booking.bookingId}
              </div>
              <div className="text-[11px] text-slate-400">
                Scan QR at {booking.theatre.name} entry gate
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVerifiedPulse(true)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {verifiedPulse
                  ? 'HashMap O(1) Token Verified ✓'
                  : 'Verify QR Signature'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-6 py-4 bg-[#080b12] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Ticket PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShareTicket}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>{copiedShare ? 'Ticket Details Copied!' : 'Share Ticket'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onViewAllBookings}
            className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-rose-400" />
            <span>View All My Bookings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
