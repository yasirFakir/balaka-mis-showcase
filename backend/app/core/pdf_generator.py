import os
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from app.models.transaction import Transaction
from app.models.service_request import ServiceRequest
from datetime import datetime
from app.core.config import settings
from PIL import Image
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

# Gonia Theme Colors (Deep Horizon v1.5)
ABYSS_BLUE = colors.HexColor("#065084")
MIDNIGHT_VIOLET = colors.HexColor("#1E0741")
HORIZON_TEAL = colors.HexColor("#78B9B5")
IVORY_WHITE = colors.HexColor("#FCFDFF")
PURE_BLACK = colors.black

# Standardized Typography & Spacing
FONT_BOLD = "Helvetica-Bold"
FONT_REG = "Helvetica"
FONT_MONO = "Courier-Bold"

S_BRAND = 18    # Brand name
S_TITLE = 11    # Doc title
S_SECTION = 9   # Section headers
S_DATA_H = 10   # Names / Methods
S_DATA = 9      # Standard text
S_SMALL = 8.5   # Table body & Details

GAP_SECTION = 0.3*inch
T_HEADER_H = 0.22*inch # Uniform table header height

# Horizontal Margins
X_LEFT = 0.75*inch
X_RIGHT = 4.1*inch
X_VAL_L = 2.8*inch # Increased offset for values to accommodate long labels

def _get_logo_path(white=False):
    """Robust logo path discovery with white variant support."""
    base_name = "balaka-logo-white.png" if white else "balaka-logo.png"
    
    # 1. Try absolute path from project root
    abs_path = settings.PROJECT_ROOT / "backend" / "static" / "assets" / base_name
    if abs_path.exists():
        return str(abs_path)
    
    # 2. Try relative from current directory
    if os.path.exists(f"backend/static/assets/{base_name}"):
        return f"backend/static/assets/{base_name}"
        
    # 3. If requesting white and it doesn't exist, try to generate it from standard
    if white:
        std_path = _get_logo_path(white=False)
        if std_path:
            try:
                # Generate white version on the fly
                img = Image.open(std_path).convert("RGBA")
                datas = img.getdata()
                
                new_data = []
                for item in datas:
                    # If pixel is not fully transparent, make it white
                    if item[3] > 0:
                        new_data.append((255, 255, 255, item[3]))
                    else:
                        new_data.append(item)
                
                img.putdata(new_data)
                target_dir = settings.PROJECT_ROOT / "backend" / "static" / "assets"
                if not target_dir.exists():
                    target_dir.mkdir(parents=True, exist_ok=True)
                
                white_path = str(target_dir / "balaka-logo-white.png")
                img.save(white_path, "PNG")
                return white_path
            except Exception as e:
                print(f"FAILED TO GENERATE WHITE LOGO: {e}")
                
    return None

LOGO_PATH = _get_logo_path(white=True)

def _draw_company_footer(p, width):
    """High-clarity structured footer with grouped contact info."""
    p.setStrokeColor(ABYSS_BLUE)
    p.setLineWidth(0.5)
    p.line(X_LEFT, 1.3*inch, width - X_LEFT, 1.3*inch)
    
    y = 1.15*inch
    
    # Column 1: Saudi Arabia
    p.setFillColor(ABYSS_BLUE)
    p.setFont(FONT_BOLD, 8)
    p.drawString(X_LEFT, y, "SAUDI ARABIA OPERATIONS")
    
    p.setFillColor(PURE_BLACK)
    p.setFont(FONT_REG, 7)
    p.drawString(X_LEFT, y - 0.15*inch, "RIYADH: Office 117, Lulu Hypermarket, Batha")
    p.setFont(FONT_MONO, 9) # Prominent Mono for Number
    p.drawString(X_LEFT, y - 0.32*inch, "+966 50 190 2789")
    
    p.setFont(FONT_REG, 7)
    p.drawString(X_LEFT, y - 0.48*inch, "JEDDAH CONTACT:")
    p.setFont(FONT_MONO, 9)
    p.drawString(X_LEFT, y - 0.65*inch, "+966 50 190 2789")

    # Column 2: Bangladesh & Web
    mid_x = width * 0.48
    p.setFillColor(ABYSS_BLUE)
    p.setFont(FONT_BOLD, 8)
    p.drawString(mid_x, y, "BANGLADESH & WEB")
    
    p.setFillColor(PURE_BLACK)
    p.setFont(FONT_REG, 7)
    p.drawString(mid_x, y - 0.15*inch, "DHAKA: Rahman Chamber, Motijheel")
    p.setFont(FONT_MONO, 9)
    p.drawString(mid_x, y - 0.32*inch, "+880 1831 831111")
    
    p.setFont(FONT_REG, 7)
    p.drawString(mid_x, y - 0.48*inch, "EMAIL: support@airbalakatravel.com")
    p.drawString(mid_x, y - 0.62*inch, "WEB: www.airbalakatravel.com")

    # WhatsApp QR Code (Right Side)
    qr_x = width - X_LEFT - 0.7*inch
    try:
        qr_code = qr.QrCodeWidget("https://wa.me/966501902789")
        bounds = qr_code.getBounds()
        qw = bounds[2] - bounds[0]
        qh = bounds[3] - bounds[1]
        d = Drawing(50, 50, transform=[50./qw, 0, 0, 50./qh, 0, 0])
        d.add(qr_code)
        renderPDF.draw(d, p, qr_x, 0.5*inch)
        
        p.setFillColor(ABYSS_BLUE)
        p.setFont(FONT_BOLD, 6)
        p.drawCentredString(qr_x + 0.35*inch, 0.4*inch, "WHATSAPP")
    except Exception as e:
        print(f"FAILED TO DRAW QR CODE: {e}")

    # Official Signature Line
    p.setFillColor(colors.grey)
    p.setFont("Helvetica-Oblique", 6)
    p.drawCentredString(width/2, 0.2*inch, "Official System Generated Certificate. No physical signature required.")

def _draw_header_logo(p, height):
    if LOGO_PATH and os.path.exists(LOGO_PATH):
        p.drawImage(LOGO_PATH, X_LEFT, height - 1.05*inch, width=0.8*inch, height=0.8*inch, mask='auto')
    else:
        p.setStrokeColor(colors.white)
        p.rect(X_LEFT, height - 1.05*inch, 0.8*inch, 0.8*inch, stroke=1)
    return 1.8*inch

def _draw_base_header(p, width, height, title, ref_label, ref_val):
    p.setFillColor(ABYSS_BLUE)
    p.rect(0, height - 1.2*inch, width, 1.2*inch, fill=1, stroke=0)
    
    header_x = _draw_header_logo(p, height)
    p.setFillColor(colors.white)
    p.setFont(FONT_BOLD, S_BRAND)
    p.drawString(header_x, height - 0.55*inch, "Air Balaka International Travel")
    
    p.setFont(FONT_BOLD, S_TITLE)
    p.drawString(header_x, height - 0.85*inch, title.upper())
    
    p.setFont(FONT_MONO, 10)
    p.drawRightString(width - X_LEFT, height - 0.85*inch, f"{ref_label}: {ref_val}")
    return height - 1.2*inch

def generate_receipt_pdf(transaction: Transaction) -> BytesIO:
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    p.setFillColor(IVORY_WHITE); p.rect(0, 0, width, height, fill=1, stroke=0)

    y = _draw_base_header(p, width, height, "Official Receipt", "TXN", transaction.transaction_id)
    y -= 0.3*inch

    # Client & Payment Info
    p.setFillColor(MIDNIGHT_VIOLET); p.setFont(FONT_BOLD, S_SECTION)
    p.drawString(X_LEFT, y, "CLIENT IDENTITY")
    p.drawString(X_RIGHT, y, "PAYMENT DATA")
    y -= 0.05*inch; p.setStrokeColor(ABYSS_BLUE); p.setLineWidth(0.5); p.line(X_LEFT, y, width - X_LEFT, y)
    
    y -= 0.25*inch
    p.setFillColor(PURE_BLACK); p.setFont(FONT_BOLD, S_DATA_H)
    p.drawString(X_LEFT, y, (transaction.user.full_name or "CLIENT").upper())
    p.setFont(FONT_MONO, S_DATA_H)
    p.drawString(X_RIGHT, y, f"Method: {transaction.payment_method.upper()}")
    
    y -= 0.2*inch
    p.setFont(FONT_MONO, S_DATA)
    p.drawString(X_LEFT, y, transaction.user.email or "N/A")
    p.drawString(X_RIGHT, y, f"Date: {transaction.created_at.strftime('%d %b %Y, %H:%M')}")
    
    y -= 0.2*inch
    p.drawString(X_LEFT, y, transaction.user.phone_number or "N/A")
    ref = f"Ref: {transaction.internal_reference_id or 'OFFICE-CASH'}"
    if transaction.client_reference_id: ref += f" / {transaction.client_reference_id}"
    p.drawString(X_RIGHT, y, ref)

    # Table
    y -= GAP_SECTION
    p.setFillColor(MIDNIGHT_VIOLET); p.rect(X_LEFT, y - T_HEADER_H, width - 1.5*inch, T_HEADER_H, fill=1, stroke=0)
    p.setFillColor(colors.white); p.setFont(FONT_BOLD, S_SMALL)
    p.drawString(X_LEFT + 0.1*inch, y - 0.16*inch, "DESCRIPTION")
    p.drawRightString(width - X_LEFT - 0.1*inch, y - 0.16*inch, "AMOUNT (SR)")
    
    y -= 0.4*inch
    p.setFillColor(PURE_BLACK); p.setFont(FONT_MONO, S_SMALL)
    p.drawString(X_LEFT + 0.1*inch, y, f"PAYMENT FOR {transaction.service_request.service_definition.name}".upper())
    p.drawRightString(width - X_LEFT - 0.1*inch, y, f"{transaction.amount + transaction.discount:.2f}")
    
    if transaction.discount > 0:
        y -= 0.2*inch
        p.drawString(X_LEFT + 0.1*inch, y, "LESS: DISCOUNT / ADJUSTMENT")
        p.drawRightString(width - X_LEFT - 0.1*inch, y, f"-{transaction.discount:.2f}")

    # Total Box
    y -= GAP_SECTION
    p.setFillColor(HORIZON_TEAL); p.rect(width - 3.5*inch, y - 0.22*inch, 2.75*inch, 0.44*inch, fill=1, stroke=0)
    p.setFillColor(colors.white); p.setFont(FONT_BOLD, 12)
    p.drawString(width - 3.4*inch, y - 0.05*inch, "TOTAL PAID")
    p.drawRightString(width - X_LEFT - 0.1*inch, y - 0.05*inch, f"SR {transaction.amount:.2f}")

    _draw_company_footer(p, width)
    p.showPage(); p.save()
    buffer.seek(0); return buffer

def generate_service_invoice_pdf(request: ServiceRequest, transactions: list[Transaction]) -> BytesIO:
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    verified_txns = [t for t in transactions if t.status == "Verified"]
    total_paid = sum(t.amount for t in verified_txns)
    balance_due = round(request.selling_price - total_paid, 2)
    is_fully_paid = balance_due <= 0.01

    p.setFillColor(IVORY_WHITE); p.rect(0, 0, width, height, fill=1, stroke=0)
    y = _draw_base_header(p, width, height, "Invoice & Settlement", "REQ", f"{request.id:04d}")
    y -= 0.3*inch

    # Client Info
    p.setFillColor(MIDNIGHT_VIOLET); p.setFont(FONT_BOLD, S_SECTION)
    p.drawString(X_LEFT, y, "BILLING RECIPIENT")
    p.drawString(X_RIGHT, y, "RECEIPT INFO")
    y -= 0.05*inch; p.setStrokeColor(ABYSS_BLUE); p.setLineWidth(0.5); p.line(X_LEFT, y, width - X_LEFT, y)
    
    is_staff = any(r.name in ["Admin", "Manager", "Staff", "Finance"] for r in request.user.roles)
    if is_staff and request.form_data:
        disp_name = (request.form_data.get("full_name") or request.form_data.get("sender_name") or "CLIENT").upper()
        disp_phone = request.form_data.get("contact_number") or request.form_data.get("phone_number") or "N/A"
    else:
        disp_name = (request.user.full_name or "VALUED CLIENT").upper()
        disp_phone = request.user.phone_number or "N/A"

    y -= 0.25*inch; p.setFillColor(PURE_BLACK); p.setFont(FONT_BOLD, S_DATA_H)
    p.drawString(X_LEFT, y, disp_name)
    p.setFont(FONT_MONO, S_DATA)
    p.drawString(X_RIGHT, y, f"Date: {request.created_at.strftime('%d %b %Y')}")
    
    y -= 0.2*inch
    p.drawString(X_LEFT, y, request.user.email if not is_staff else "—")
    p.drawString(X_RIGHT, y, f"Status: {request.status.upper()}")
    
    y -= 0.2*inch
    p.drawString(X_LEFT, y, disp_phone)
    p.setFont(FONT_BOLD, S_DATA_H)
    p.setFillColor(colors.HexColor("#10B981") if is_fully_paid else colors.red)
    p.drawString(X_RIGHT, y, f"PAYMENT: {'PAID' if is_fully_paid else 'UNPAID / BALANCE'}")

    # App Details
    if request.form_data:
        y -= GAP_SECTION
        p.setFillColor(ABYSS_BLUE); p.setFont(FONT_BOLD, S_SECTION)
        p.drawString(X_LEFT, y, "APPLICATION DETAILS")
        y -= 0.04*inch; p.line(X_LEFT, y, width - X_LEFT, y)
        
        y -= 0.22*inch; p.setFillColor(PURE_BLACK)
        items = list({k: v for k, v in request.form_data.items() if not str(v).startswith(("/static", "http"))}.items())
        
        def fmt(v):
            if isinstance(v, list): return ", ".join(map(str, v))
            v_s = str(v)
            if isinstance(v, str) and len(v_s) > 10 and v_s[4] == "-" and v_s[7] == "-":
                try: return datetime.fromisoformat(v_s.replace("Z", "+00:00")).strftime('%d %b %Y')
                except: pass
            return v_s

        for k, v in items:
            p.setFont(FONT_BOLD, S_SMALL)
            p.drawString(X_LEFT + 0.1*inch, y, f"{k.replace('_',' ').upper()[:28]}:")
            p.setFont(FONT_MONO, S_SMALL)
            p.drawString(X_VAL_L, y, fmt(v)[:55])
            y -= 0.18*inch
            if y < 1.4*inch: break

    # Service Table
    y -= 0.25*inch
    p.setFillColor(MIDNIGHT_VIOLET); p.rect(X_LEFT, y - T_HEADER_H, width - 1.5*inch, T_HEADER_H, fill=1, stroke=0)
    p.setFillColor(colors.white); p.setFont(FONT_BOLD, S_SMALL)
    p.drawString(X_LEFT + 0.1*inch, y - 0.16*inch, "SERVICE DESCRIPTION"); p.drawRightString(width - X_LEFT - 0.1*inch, y - 0.16*inch, "CHARGE (SR)")
    
    y -= 0.35*inch; p.setFillColor(PURE_BLACK); p.setFont(FONT_MONO, S_SMALL)
    income_items = [i for i in (request.financial_breakdown or []) if i.get("type") == "INCOME"]
    if income_items:
        for item in income_items:
            p.drawString(X_LEFT + 0.1*inch, y, str(item.get("label", "Item")).upper())
            p.drawRightString(width - X_LEFT - 0.1*inch, y, f"{float(item.get('amount', 0)):.2f}"); y -= 0.18*inch
    else:
        name = request.service_definition.name + (f" ({request.variant.name_en})" if request.variant else "")
        p.drawString(X_LEFT + 0.1*inch, y, name.upper()); p.drawRightString(width - X_LEFT - 0.1*inch, y, f"{request.selling_price:.2f}"); y -= 0.18*inch

    # Payment History
    if verified_txns:
        y -= 0.2*inch; p.setFillColor(ABYSS_BLUE); p.setFont(FONT_BOLD, S_SECTION); p.drawString(X_LEFT, y, "PAYMENT HISTORY")
        y -= 0.04*inch; p.line(X_LEFT, y, width - X_LEFT, y)
        y -= 0.2*inch; p.setFillColor(MIDNIGHT_VIOLET); p.rect(X_LEFT, y - T_HEADER_H, width - 1.5*inch, T_HEADER_H, fill=1, stroke=0)
        p.setFillColor(colors.white); p.setFont(FONT_BOLD, S_SMALL)
        p.drawString(X_LEFT + 0.1*inch, y - 0.16*inch, "DATE"); p.drawString(X_LEFT + 1.1*inch, y - 0.16*inch, "METHOD"); p.drawString(X_LEFT + 2.4*inch, y - 0.16*inch, "TXN ID / REF"); p.drawRightString(width - X_LEFT - 0.1*inch, y - 0.16*inch, "AMOUNT")
        
        y -= 0.35*inch; p.setFillColor(PURE_BLACK); p.setFont(FONT_MONO, S_SMALL)
        for t in verified_txns:
            p.drawString(X_LEFT + 0.1*inch, y, t.created_at.strftime('%d %b %Y'))
            p.drawString(X_LEFT + 1.1*inch, y, t.payment_method.upper())
            r_t = t.transaction_id + (f" ({t.internal_reference_id or t.client_reference_id})" if (t.internal_reference_id or t.client_reference_id) else "")
            p.drawString(X_LEFT + 2.4*inch, y, r_t[:38]); p.drawRightString(width - X_LEFT - 0.1*inch, y, f"{t.amount:.2f}")
            y -= 0.18*inch

    # Final Summary Box
    y = max(y - 0.2*inch, 2.0*inch)
    p.setStrokeColor(ABYSS_BLUE); p.setLineWidth(0.5); p.rect(width - 3.5*inch, y - 0.8*inch, 2.75*inch, 0.9*inch, stroke=1)
    ty = y - 0.15*inch; p.setFillColor(PURE_BLACK); p.setFont(FONT_BOLD, S_DATA)
    p.drawString(width - 3.4*inch, ty, "Total Billed:"); p.drawRightString(width - X_LEFT - 0.1*inch, ty, f"{request.selling_price:.2f}")
    ty -= 0.22*inch; p.drawString(width - 3.4*inch, ty, "Total Settled:"); p.drawRightString(width - X_LEFT - 0.1*inch, ty, f"{total_paid:.2f}")
    ty -= 0.3*inch; p.setFont(FONT_BOLD, 12); p.drawString(width - 3.4*inch, ty, "DUE BALANCE:")
    p.setFillColor(colors.red if balance_due > 0.01 else colors.HexColor("#10B981")); p.drawRightString(width - X_LEFT - 0.1*inch, ty, f"SR {max(0, balance_due):.2f}")

    _draw_company_footer(p, width); p.showPage(); p.save()
    buffer.seek(0); return buffer
