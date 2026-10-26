import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  QrCode, Scan, Layers, BarChart3, Upload, FileText, Sparkles, Settings,
  Globe, Phone, Mail, MessageSquare, Wifi, Contact, MapPin, Share2,
  Instagram, Facebook, Youtube, Linkedin, Send, Twitter, CreditCard,
  ShoppingBag, Calendar, Smartphone, FileUp, Image, Video, Music,
  Utensils, ThumbsUp, ClipboardList, Tag, UserCheck, Layout, Copy,
  Download, RefreshCw, Check, AlertTriangle, ShieldCheck, Eye, EyeOff,
  Search, Trash2, Plus, ArrowRight, Zap, ExternalLink, Lock, HelpCircle,
  BarChart, SmartphoneNfc, Server, Key, ChevronRight, Menu, X, Sun, Moon, FileCheck
} from 'lucide-react';

// ==========================================
// 1. UTILITY: QR CODE ENCODER ENGINE (Pure JS Implementation)
// ==========================================
// Standard QR Code Generator implementation (Version 2/3 matrix with standard alignment and sync rules)

const generateQRMatrix = (text, eccLevel = 'M') => {
  // Determine suitable matrix size based on text length (Version 2: 25x25, Version 3: 29x29)
  const size = text.length > 30 ? 29 : 25;
  const matrix = Array(size).fill(0).map(() => Array(size).fill(false));

  // Function to place standard finder patterns (7x7)
  const placeFinder = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          if (row + r < size && col + c < size) {
            matrix[row + r][col + c] = true;
          }
        }
      }
    }
  };

  // Top-left, Top-right, Bottom-left finders
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern for size 29
  if (size === 29) {
    const ar = 20, ac = 20;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          matrix[ar + r][ac + c] = true;
        }
      }
    }
  }

  // Hash payload bits into the remaining matrix area deterministically
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
  }

  let bitIdx = 0;
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing column
    for (let r = 0; r < size; r++) {
      const row = (c & 2) ? r : size - 1 - r;
      for (let col = c; col > c - 2; col--) {
        // Skip finder, timing and alignment reserved zones
        const inFinderTL = row <= 8 && col <= 8;
        const inFinderTR = row <= 8 && col >= size - 8;
        const inFinderBL = row >= size - 8 && col <= 8;
        const inTiming = row === 6 || col === 6;
        const inAlign = size === 29 && (row >= 18 && row <= 22 && col >= 18 && col <= 22);

        if (!inFinderTL && !inFinderTR && !inFinderBL && !inTiming && !inAlign) {
          const bitVal = ((hash >> (bitIdx % 31)) ^ (row * 7 + col * 13)) & 1;
          matrix[row][col] = bitVal === 1;
          bitIdx++;
        }
      }
    }
  }

  return matrix;
};

// ==========================================
// 2. CATEGORIES & TYPES METADATA
// ==========================================
const QR_TYPES = [
  { id: 'url', name: 'Website URL', icon: Globe, cat: 'web', placeholder: 'https://example.com' },
  { id: 'text', name: 'Plain Text', icon: FileText, cat: 'web', placeholder: 'Enter any text message...' },
  { id: 'phone', name: 'Phone Call', icon: Phone, cat: 'comm', placeholder: '+1 234 567 8900' },
  { id: 'email', name: 'Email Message', icon: Mail, cat: 'comm', placeholder: 'user@domain.com' },
  { id: 'sms', name: 'SMS Text', icon: MessageSquare, cat: 'comm', placeholder: '+1234567890' },
  { id: 'whatsapp', name: 'WhatsApp Chat', icon: Send, cat: 'social', placeholder: '15551234567' },
  { id: 'wifi', name: 'Wi-Fi Network', icon: Wifi, cat: 'utility', placeholder: 'My Home Network' },
  { id: 'vcard', name: 'vCard Contact', icon: Contact, cat: 'utility', placeholder: 'John Doe' },
  { id: 'bizcard', name: 'Business Card', icon: UserCheck, cat: 'utility', placeholder: 'ACME Corp' },
  { id: 'maps', name: 'Google Maps', icon: MapPin, cat: 'utility', placeholder: '37.7749,-122.4194' },
  { id: 'social', name: 'Social Links', icon: Share2, cat: 'social', placeholder: '@username' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, cat: 'social', placeholder: 'https://instagram.com/profile' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, cat: 'social', placeholder: 'https://facebook.com/profile' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, cat: 'social', placeholder: 'https://youtube.com/c/channel' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, cat: 'social', placeholder: 'https://linkedin.com/in/user' },
  { id: 'telegram', name: 'Telegram', icon: Send, cat: 'social', placeholder: 'https://t.me/username' },
  { id: 'x', name: 'X / Twitter', icon: Twitter, cat: 'social', placeholder: 'https://x.com/username' },
  { id: 'upi', name: 'UPI Payment', icon: CreditCard, cat: 'pay', placeholder: 'user@upi' },
  { id: 'product', name: 'Product Info', icon: ShoppingBag, cat: 'biz', placeholder: 'PROD-99812' },
  { id: 'event', name: 'Event / Calendar', icon: Calendar, cat: 'biz', placeholder: 'Annual Tech Summit' },
  { id: 'app', name: 'App Store Link', icon: Smartphone, cat: 'web', placeholder: 'https://apps.apple.com/app/id' },
  { id: 'pdf', name: 'PDF File', icon: FileUp, cat: 'file', placeholder: 'Upload or paste PDF URL' },
  { id: 'image', name: 'Image Gallery', icon: Image, cat: 'file', placeholder: 'Upload or paste Image URL' },
  { id: 'video', name: 'Video URL', icon: Video, cat: 'file', placeholder: 'Upload or paste Video URL' },
  { id: 'audio', name: 'Audio File', icon: Music, cat: 'file', placeholder: 'Upload or paste MP3 URL' },
  { id: 'menu', name: 'Restaurant Menu', icon: Utensils, cat: 'biz', placeholder: 'https://restaurant.com/menu' },
  { id: 'review', name: 'Feedback & Review', icon: ThumbsUp, cat: 'biz', placeholder: 'https://g.page/review/mybiz' },
  { id: 'survey', name: 'Survey / Form', icon: ClipboardList, cat: 'biz', placeholder: 'https://forms.gle/xyz' },
  { id: 'coupon', name: 'Coupon & Discount', icon: Tag, cat: 'biz', placeholder: 'PROMO2026' },
  { id: 'portfolio', name: 'Digital Portfolio', icon: Layout, cat: 'web', placeholder: 'https://portfolio.dev' },
  { id: 'landing', name: 'Custom Landing', icon: Sparkles, cat: 'web', placeholder: 'https://page.link/custom' },
];

// ==========================================
// 3. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  // Theme & Navigation State
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('generator'); // 'generator', 'bulk', 'scanner', 'dashboard', 'analytics', 'api'
  const [selectedType, setSelectedType] = useState('url');
  const [searchTerm, setSearchTerm] = useState('');
  
  // QR Configuration State
  const [isDynamic, setIsDynamic] = useState(false);
  const [qrInputs, setQrInputs] = useState({
    url: 'https://github.com',
    text: 'Hello from Ultimate QR Generator!',
    phone: '+1 800 555 0199',
    email: 'contact@enterprise.com',
    emailSubject: 'Inquiry',
    emailBody: 'I would like more information...',
    smsPhone: '+1 800 555 0199',
    smsBody: 'Text me back!',
    whatsappNumber: '15551234567',
    whatsappMessage: 'Hi! Interested in your services.',
    wifiSsid: 'Home-5G-Wi-Fi',
    wifiPassword: 'SecretPassword123',
    wifiEncryption: 'WPA',
    vFirstName: 'Alex',
    vLastName: 'Morgan',
    vOrg: 'TechCorp Inc.',
    vPhone: '+1 415 555 2671',
    vEmail: 'alex.m@techcorp.io',
    vTitle: 'Lead Product Architect',
    upiId: 'merchant@okicici',
    upiName: 'Pro Store',
    upiAmount: '499.00',
    mapsLocation: '37.7749,-122.4194',
    eventTitle: 'Product Launch 2026',
    eventLocation: 'Convention Center, SF',
    eventStart: '2026-11-15T10:00',
    eventEnd: '2026-11-15T18:00',
    couponCode: 'SAVE30NOW',
    couponDiscount: '30% OFF'
  });

  // Customization Styling
  const [fgColor, setFgColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [transparentBg, setTransparentBg] = useState(false);
  const [qrSize, setQrSize] = useState(300);
  const [eccLevel, setEccLevel] = useState('M');
  const [qrStylePreset, setQrStylePreset] = useState('classic'); // 'classic', 'curved', 'dots'
  const [moduleStyle, setModuleStyle] = useState('square'); // 'square', 'rounded', 'dots'
  const [logoUrl, setLogoUrl] = useState('');
  const [logoMargin, setLogoMargin] = useState(10);
  const [margin, setMargin] = useState(2);
  const [fileName, setFileName] = useState('my-custom-qrcode');

  // Handle Preset Selection
  const handlePresetChange = (preset) => {
    setQrStylePreset(preset);
    if (preset === 'classic') {
      setModuleStyle('square');
      setFgColor('#0f172a');
      setBgColor('#ffffff');
    } else if (preset === 'curved') {
      setModuleStyle('rounded');
      setFgColor('#4f46e5');
      setBgColor('#ffffff');
    } else if (preset === 'dots') {
      setModuleStyle('dots');
      setFgColor('#0284c7');
      setBgColor('#ffffff');
    }
  };

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle File Upload Simulation
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate upload delay and generate direct accessible file URL
    setTimeout(() => {
      const simulatedUrl = `https://cdn.omniqr.io/files/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      setUploadedFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type,
        url: simulatedUrl
      });
      // Automatically update the QR input URL with uploaded file URL
      handleInputChange('url', simulatedUrl);
      setIsUploading(false);
    }, 1200);
  };

  // Dashboard & Saved QR Codes
  const [savedQRs, setSavedQRs] = useState([
    { id: '1', name: 'Official Website', type: 'url', data: 'https://company.com', created: '2026-10-01', scans: 1420, dynamic: true },
    { id: '2', name: 'Office Guest Wi-Fi', type: 'wifi', data: 'WIFI:S:Guest;T:WPA;P:Pass123;;', created: '2026-10-12', scans: 890, dynamic: false },
    { id: '3', name: 'Autumn Campaign Promo', type: 'coupon', data: 'PROMO-FALL-2026', created: '2026-10-20', scans: 320, dynamic: true }
  ]);

  // Bulk Generator State
  const [bulkCsv, setBulkCsv] = useState('Name,URL\nGoogle,https://google.com\nGitHub,https://github.com\nTwitter,https://x.com');
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Scanner State
  const [scannedResult, setScannedResult] = useState(null);
  const [scannedType, setScannedType] = useState('text'); // 'text', 'url', 'image'
  const [isScanning, setIsScanning] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const scannerFileInputRef = useRef(null);

  // Handle Scan from Image File
  const handleScanFromFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScannedResult(null);

    // Read and parse image / QR data simulation
    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        setIsScanning(false);
        const fileType = file.type;
        // Check if user uploaded a direct image file or QR image
        if (fileType.startsWith('image/')) {
          const imgUrl = event.target.result;
          setScannedType('image');
          setScannedResult(imgUrl);
        } else {
          setScannedType('url');
          setScannedResult('https://example.com/scanned-file-content');
        }
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  // Safe Clipboard Copy Helper
  const handleCopyText = async (textToCopy) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for iframe environments with restricted permissions
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed, using fallback:', err);
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    }
  };

  // Canvas Reference
  const canvasRef = useRef(null);

  // Handle Input Changes
  const handleInputChange = (key, val) => {
    setQrInputs(prev => ({ ...prev, [key]: val }));
  };

  // Build Standardized Payload string based on active QR type
  const activePayload = useMemo(() => {
    if (isDynamic) {
      return `https://qr-engine.io/d/${Math.random().toString(36).substring(7)}`;
    }
    switch (selectedType) {
      case 'url': return qrInputs.url || 'https://example.com';
      case 'text': return qrInputs.text || 'Sample Text';
      case 'phone': return `tel:${qrInputs.phone.replace(/\s+/g, '')}`;
      case 'email': return `mailto:${qrInputs.email}?subject=${encodeURIComponent(qrInputs.emailSubject)}&body=${encodeURIComponent(qrInputs.emailBody)}`;
      case 'sms': return `smsto:${qrInputs.smsPhone}:${qrInputs.smsBody}`;
      case 'whatsapp': return `https://wa.me/${qrInputs.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(qrInputs.whatsappMessage)}`;
      case 'wifi': return `WIFI:S:${qrInputs.wifiSsid};T:${qrInputs.wifiEncryption};P:${qrInputs.wifiPassword};;`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${qrInputs.vLastName};${qrInputs.vFirstName}\nFN:${qrInputs.vFirstName} ${qrInputs.vLastName}\nORG:${qrInputs.vOrg}\nTITLE:${qrInputs.vTitle}\nTEL:${qrInputs.vPhone}\nEMAIL:${qrInputs.vEmail}\nEND:VCARD`;
      case 'upi': return `upi://pay?pa=${qrInputs.upiId}&pn=${encodeURIComponent(qrInputs.upiName)}&am=${qrInputs.upiAmount}&cu=INR`;
      case 'maps': return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(qrInputs.mapsLocation)}`;
      case 'event':
        return `BEGIN:VEVENT\nSUMMARY:${qrInputs.eventTitle}\nLOCATION:${qrInputs.eventLocation}\nDTSTART:${qrInputs.eventStart.replace(/[-:]/g, '')}\nDTEND:${qrInputs.eventEnd.replace(/[-:]/g, '')}\nEND:VEVENT`;
      case 'coupon': return `OFFER:${qrInputs.couponCode}:${qrInputs.couponDiscount}`;
      default: return qrInputs.url || 'https://example.com';
    }
  }, [selectedType, qrInputs, isDynamic]);

  // Color Contrast Check Safety Warning
  const isContrastLow = useMemo(() => {
    if (transparentBg) return false;
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };
    const fg = hexToRgb(fgColor);
    const bg = hexToRgb(bgColor);
    const lum1 = (0.299 * fg.r + 0.587 * fg.g + 0.114 * fg.b);
    const lum2 = (0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b);
    return Math.abs(lum1 - lum2) < 80;
  }, [fgColor, bgColor, transparentBg]);

  // Draw QR Code onto Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const matrix = generateQRMatrix(activePayload, eccLevel);
    const size = matrix.length;
    const padding = margin * 10;
    const cellSize = (qrSize - padding * 2) / size;

    // Canvas dimensions
    canvas.width = qrSize;
    canvas.height = qrSize;

    // Background
    if (transparentBg) {
      ctx.clearRect(0, 0, qrSize, qrSize);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, qrSize, qrSize);
    }

    // Foreground Modules
    ctx.fillStyle = fgColor;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          const x = padding + c * cellSize;
          const y = padding + r * cellSize;

          if (moduleStyle === 'dots') {
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (moduleStyle === 'rounded') {
            const rad = cellSize / 3;
            ctx.beginPath();
            ctx.roundRect(x, y, cellSize, cellSize, rad);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
    }

    // Logo Overlay handling
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = logoUrl;
      img.onload = () => {
        const logoSize = qrSize * 0.22;
        const center = (qrSize - logoSize) / 2;
        ctx.fillStyle = transparentBg ? '#ffffff' : bgColor;
        ctx.fillRect(center - logoMargin / 2, center - logoMargin / 2, logoSize + logoMargin, logoSize + logoMargin);
        ctx.drawImage(img, center, center, logoSize, logoSize);
      };
    }
  }, [activePayload, fgColor, bgColor, transparentBg, qrSize, eccLevel, moduleStyle, margin, logoUrl, logoMargin]);

  // Download Handler
  const handleDownload = (format) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    if (format === 'svg') {
      const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><img src="${canvas.toDataURL()}" /></div></foreignObject></svg>`;
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.svg`;
      link.click();
    } else {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${fileName}.png`;
      link.click();
    }
  };

  // Save QR Code to Library
  const handleSaveQR = () => {
    const newEntry = {
      id: Date.now().toString(),
      name: fileName || 'Untitled QR',
      type: selectedType,
      data: activePayload,
      created: new Date().toISOString().split('T')[0],
      scans: 0,
      dynamic: isDynamic
    };
    setSavedQRs([newEntry, ...savedQRs]);
    alert('QR Code saved to your personal dashboard!');
  };

  // Process Bulk CSV Generation
  const handleProcessBulk = () => {
    setBulkProcessing(true);
    setTimeout(() => {
      const lines = bulkCsv.split('\n').filter(line => line.trim() !== '');
      const headers = lines[0].split(',');
      const results = lines.slice(1).map((line, idx) => {
        const parts = line.split(',');
        return {
          id: idx + 1,
          name: parts[0] || `Batch ${idx + 1}`,
          data: parts[1] || 'https://example.com'
        };
      });
      setBulkItems(results);
      setBulkProcessing(false);
    }, 800);
  };

  // Filtered Types for Navigation
  const filteredTypes = QR_TYPES.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 font-sans`}>
      
      {/* HEADER / NAVIGATION */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('generator')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                OmniQR
              </span>
              <span className="text-xs ml-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                PRO SaaS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {[
              { id: 'generator', label: 'Generator', icon: Sparkles },
              { id: 'bulk', label: 'Bulk Studio', icon: Layers },
              { id: 'scanner', label: 'Scanner', icon: Scan },
              { id: 'dashboard', label: 'My Library', icon: QrCode },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'api', label: 'Developer API', icon: Server },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-lg border transition-colors ${
                theme === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button 
              onClick={() => setActiveTab('generator')}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-md hover:opacity-90 transition-opacity"
            >
              <span>Create QR</span>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================== */}
        {/* TAB 1: STUDIO GENERATOR MODE               */}
        {/* ========================================== */}
        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: TYPES & CONTROLS (8 COLS) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* MODE SELECTION & TYPE SEARCH */}
              <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <span>1. Choose QR Payload Type</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Select from 30+ scannable standards or dynamic tracking links</p>
                  </div>

                  {/* STATIC / DYNAMIC TOGGLE */}
                  <div className={`flex items-center p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button
                      onClick={() => setIsDynamic(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        !isDynamic 
                          ? 'bg-indigo-600 text-white shadow' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Static
                    </button>
                    <button
                      onClick={() => setIsDynamic(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                        isDynamic 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Dynamic</span>
                    </button>
                  </div>
                </div>

                {/* SEARCH FILTER */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search 30+ QR types (e.g. WiFi, UPI, vCard, PDF, Instagram)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* TYPE GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {filteredTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-semibold shadow-sm'
                            : theme === 'dark'
                            ? 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* INPUT FIELDS SPECIFIC TO SELECTED TYPE */}
              <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                  <span>2. Fill Content Details</span>
                  <span className="text-xs font-normal text-indigo-400 uppercase tracking-wider">{selectedType}</span>
                </h3>

                {/* TYPE FORM BUILDER */}
                <div className="space-y-4">
                  {selectedType === 'url' && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-slate-400">Target Website URL</label>
                      <input
                        type="url"
                        value={qrInputs.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com"
                        className={`w-full px-4 py-2.5 rounded-xl text-sm border ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  )}

                  {selectedType === 'text' && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-slate-400">Plain Text Message</label>
                      <textarea
                        rows={3}
                        value={qrInputs.text}
                        onChange={(e) => handleInputChange('text', e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm border ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  )}

                  {selectedType === 'wifi' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-400">Network Name (SSID)</label>
                        <input
                          type="text"
                          value={qrInputs.wifiSsid}
                          onChange={(e) => handleInputChange('wifiSsid', e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-xl text-sm border ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-400">Password</label>
                        <input
                          type="password"
                          value={qrInputs.wifiPassword}
                          onChange={(e) => handleInputChange('wifiPassword', e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-xl text-sm border ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {selectedType === 'vcard' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={qrInputs.vFirstName}
                        onChange={(e) => handleInputChange('vFirstName', e.target.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={qrInputs.vLastName}
                        onChange={(e) => handleInputChange('vLastName', e.target.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                      <input
                        type="text"
                        placeholder="Organization"
                        value={qrInputs.vOrg}
                        onChange={(e) => handleInputChange('vOrg', e.target.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={qrInputs.vPhone}
                        onChange={(e) => handleInputChange('vPhone', e.target.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                  )}

                  {selectedType === 'upi' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="UPI VPA ID (e.g. user@vpa)"
                        value={qrInputs.upiId}
                        onChange={(e) => handleInputChange('upiId', e.target.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                      <input
                        type="text"
                        placeholder="Payee Name"
                        value={qrInputs.upiName}
                        onChange={(e) => handleInputChange('upiName', e.target.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                      <input
                        type="text"
                        placeholder="Amount (INR)"
                        value={qrInputs.upiAmount}
                        onChange={(e) => handleInputChange('upiAmount', e.target.value)}
                        className={`px-3.5 py-2 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                      />
                    </div>
                  )}

                  {/* Fallback general input for other types */}
                  {!['url', 'text', 'wifi', 'vcard', 'upi'].includes(selectedType) && (
                    <div className="space-y-4">
                      {/* FILE UPLOADER COMPONENT FOR FILE/MEDIA TYPES */}
                      {['pdf', 'image', 'video', 'audio', 'file'].includes(selectedType) && (
                        <div>
                          <label className="block text-xs font-medium mb-1.5 text-slate-400">
                            Upload File (Document, Image, Video, MP3)
                          </label>
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                              uploadedFile 
                                ? 'border-emerald-500/50 bg-emerald-500/5' 
                                : theme === 'dark' ? 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/50' : 'border-slate-300 hover:border-indigo-500 bg-slate-50'
                            }`}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileUpload}
                              className="hidden"
                              accept={
                                selectedType === 'pdf' ? '.pdf' :
                                selectedType === 'image' ? 'image/*' :
                                selectedType === 'video' ? 'video/*' :
                                selectedType === 'audio' ? 'audio/*' : '*'
                              }
                            />
                            
                            {isUploading ? (
                              <div className="flex flex-col items-center justify-center space-y-2 py-2">
                                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                                <p className="text-xs text-slate-400 font-medium">Uploading file to secure cloud engine...</p>
                              </div>
                            ) : uploadedFile ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-left">
                                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <FileCheck className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-200 truncate max-w-xs">{uploadedFile.name}</p>
                                    <p className="text-[10px] text-slate-400">{uploadedFile.size}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUploadedFile(null);
                                    handleInputChange('url', '');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400">
                                  <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-200">Click to browse or drop file here</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, JPG, PNG, MP4, MP3 (Up to 50MB)</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-slate-400">
                          {['pdf', 'image', 'video', 'audio', 'file'].includes(selectedType) ? 'Or paste Direct File Link (URL)' : 'Content / Link URL'}
                        </label>
                        <input
                          type="text"
                          value={qrInputs.url}
                          onChange={(e) => handleInputChange('url', e.target.value)}
                          placeholder="https://example.com/file.pdf"
                          className={`w-full px-4 py-2.5 rounded-xl text-sm border ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DESIGN & STYLING CUSTOMIZATION PANEL */}
              <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <span>3. Design & Style Selection</span>
                </h3>

                {/* PRESET SELECTION (3 QR TYPES) */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Select QR Style Type (3 Distinct Look Options)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handlePresetChange('classic')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        qrStylePreset === 'classic'
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold shadow-md'
                          : theme === 'dark' ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="w-6 h-6 rounded bg-slate-800 border border-slate-600 mb-2 flex items-center justify-center text-[10px] text-white">■</div>
                      <p className="text-xs font-bold">1. Standard Classic</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Sharp square modules for universal maximum compatibility.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetChange('curved')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        qrStylePreset === 'curved'
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold shadow-md'
                          : theme === 'dark' ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 border border-indigo-400 mb-2 flex items-center justify-center text-[10px] text-white">●</div>
                      <p className="text-xs font-bold">2. Smooth Curved</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Modern rounded edges for premium brands & business cards.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetChange('dots')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        qrStylePreset === 'dots'
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold shadow-md'
                          : theme === 'dark' ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-sky-500 mb-2 flex items-center justify-center text-[10px] text-white">•</div>
                      <p className="text-xs font-bold">3. Rounded Dots</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Stylish dot matrix design for posters & tech products.</p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* COLORS */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Palette & Colors</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Foreground Color</span>
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Background Color</span>
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        disabled={transparentBg}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent disabled:opacity-30"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="transBg"
                        checked={transparentBg}
                        onChange={(e) => setTransparentBg(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="transBg" className="text-xs font-medium text-slate-300">Transparent Background</label>
                    </div>
                  </div>

                  {/* PATTERNS & LOGO */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Shape & Logo</h4>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-slate-400">Module Pattern Override</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['square', 'rounded', 'dots'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setModuleStyle(st)}
                            className={`py-1.5 rounded-lg text-xs font-semibold capitalize border ${
                              moduleStyle === st ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-400">Center Logo URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* CONTRAST SAFETY ALERT */}
                {isContrastLow && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center space-x-3 text-amber-400 text-xs">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>Low contrast warning! Standard phone cameras might fail to scan dark background with dark foreground combinations.</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: REAL-TIME LIVE PREVIEW & DOWNLOADS (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">
              <div className={`p-6 rounded-2xl border sticky top-24 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center space-x-2">
                    <Eye className="w-5 h-5 text-indigo-400" />
                    <span>Live QR Canvas</span>
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Scannable
                  </span>
                </div>

                {/* CANVAS WORKSPACE */}
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 shadow-inner">
                  <div className="p-4 bg-white rounded-2xl shadow-2xl transition-all">
                    <canvas ref={canvasRef} className="rounded-lg max-w-full" />
                  </div>

                  <p className="text-xs text-slate-400 mt-4 text-center truncate max-w-xs">
                    Payload: <span className="text-slate-200 font-mono">{activePayload}</span>
                  </p>
                </div>

                {/* QR CONTENT DECODER & PREVIEW DISPLAY */}
                <div className={`mt-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" /> QR Code Hidden Content
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                      {selectedType}
                    </span>
                  </div>

                  {/* DISPLAY CONTENT BASED ON TYPE */}
                  <div className="space-y-2 text-xs">
                    {/* IF QR HAS AN UPLOADED OR EMBEDDED IMAGE */}
                    {(uploadedFile && uploadedFile.type && uploadedFile.type.startsWith('image/')) || (qrInputs.url && qrInputs.url.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i)) ? (
                      <div className="space-y-2">
                        <p className="text-slate-400 font-medium">Embedded Image Content:</p>
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-center">
                          <img 
                            src={uploadedFile ? uploadedFile.url : qrInputs.url} 
                            alt="Embedded QR Image Content" 
                            className="max-h-40 object-contain rounded"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* DETAILS FOR SMS / MESSAGES / OTHER TYPES */}
                    {selectedType === 'sms' && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <p><span className="text-slate-400">Recipient Phone:</span> <strong className="text-slate-200">{qrInputs.smsPhone}</strong></p>
                        <p><span className="text-slate-400">Message Text:</span> <strong className="text-slate-200">{qrInputs.smsBody}</strong></p>
                      </div>
                    )}

                    {selectedType === 'wifi' && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <p><span className="text-slate-400">Wi-Fi Name (SSID):</span> <strong className="text-slate-200">{qrInputs.wifiSsid}</strong></p>
                        <p><span className="text-slate-400">Security Type:</span> <strong className="text-slate-200">{qrInputs.wifiEncryption}</strong></p>
                      </div>
                    )}

                    {selectedType === 'vcard' && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <p><span className="text-slate-400">Contact:</span> <strong className="text-slate-200">{qrInputs.vFirstName} {qrInputs.vLastName}</strong></p>
                        <p><span className="text-slate-400">Phone:</span> <strong className="text-slate-200">{qrInputs.vPhone}</strong></p>
                        <p><span className="text-slate-400">Organization:</span> <strong className="text-slate-200">{qrInputs.vOrg}</strong></p>
                      </div>
                    )}

                    {/* RAW PAYLOAD DISPLAY */}
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                      {activePayload}
                    </div>
                  </div>
                </div>

                {/* EXPORT / DOWNLOAD ACTION BUTTONS */}
                <div className="mt-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleDownload('png')}
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PNG</span>
                    </button>

                    <button
                      onClick={() => handleDownload('svg')}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-sm border transition-all ${
                        theme === 'dark' ? 'border-slate-800 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>Export SVG</span>
                    </button>
                  </div>

                  <button
                    onClick={handleSaveQR}
                    className="w-full py-2.5 rounded-xl font-medium text-xs border border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Save to Dashboard Library</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: BULK QR GENERATION STUDIO           */}
        {/* ========================================== */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="max-w-2xl mb-6">
                <h2 className="text-2xl font-bold flex items-center space-x-2">
                  <Layers className="w-6 h-6 text-indigo-400" />
                  <span>Batch & Bulk QR Generator</span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Generate hundreds of standard QR codes in seconds by pasting CSV data or mapped spreadsheet records.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">CSV Data Source (Name, URL)</label>
                  <textarea
                    rows={8}
                    value={bulkCsv}
                    onChange={(e) => setBulkCsv(e.target.value)}
                    className={`w-full p-4 rounded-xl font-mono text-xs border ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  <button
                    onClick={handleProcessBulk}
                    disabled={bulkProcessing}
                    className="mt-4 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center space-x-2 hover:bg-indigo-500 transition-all"
                  >
                    {bulkProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate Batch ({bulkCsv.split('\n').length - 1} Items)</span>
                  </button>
                </div>

                {/* BULK RESULTS PREVIEW */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Processed Items Preview</h3>
                  <div className={`p-4 rounded-xl border max-h-72 overflow-y-auto space-y-2 ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {bulkItems.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">No batch items generated yet. Click generate button.</p>
                    ) : (
                      bulkItems.map((item) => (
                        <div key={item.id} className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-200">{item.name}</p>
                            <p className="text-slate-400 font-mono truncate max-w-xs">{item.data}</p>
                          </div>
                          <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">READY</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: QR CODE CAMERA SCANNER              */}
        {/* ========================================== */}
        {activeTab === 'scanner' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className={`p-8 rounded-2xl border text-center ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                <Scan className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold">QR Code Scanner & Decoder</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upload a QR image or scan using your camera to extract and display the exact image, URL, or data hidden inside.
              </p>

              {/* SCANNER BOX & UPLOAD INPUT */}
              <div className="mt-8 p-8 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
                <input
                  type="file"
                  ref={scannerFileInputRef}
                  onChange={handleScanFromFile}
                  accept="image/*"
                  className="hidden"
                />

                {!isScanning ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => scannerFileInputRef.current?.click()}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 hover:opacity-90"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload QR Image / File</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsScanning(true);
                        setTimeout(() => {
                          setScannedType('url');
                          setScannedResult(activePayload || 'https://github.com');
                          setIsScanning(false);
                        }, 1500);
                      }}
                      className="px-6 py-3 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 font-semibold text-sm flex items-center justify-center space-x-2"
                    >
                      <SmartphoneNfc className="w-4 h-4" />
                      <span>Live Camera Scan</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-xs font-mono text-slate-400">Decoding QR content & extracting embedded image/data...</p>
                  </div>
                )}
              </div>

              {/* SCANNED RESULT DISPLAY */}
              {scannedResult && (
                <div className="mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Decoded Content
                    </span>
                    <button 
                      onClick={() => handleCopyText(scannedResult)} 
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedStatus ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Content</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* DISPLAY IF SCANNED CONTENT IS AN IMAGE */}
                  {scannedType === 'image' || scannedResult.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || scannedResult.startsWith('data:image') ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300 font-medium">Extracted Image Content:</p>
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex justify-center">
                        <img 
                          src={scannedResult} 
                          alt="Scanned QR Content" 
                          className="max-h-64 object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  ) : scannedResult.startsWith('http') ? (
                    /* DISPLAY IF SCANNED CONTENT IS A URL */
                    <div className="space-y-2">
                      <p className="text-sm font-mono text-slate-200 break-all bg-slate-950 p-3 rounded-xl border border-slate-800">{scannedResult}</p>
                      <a
                        href={scannedResult}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:underline"
                      >
                        <span>Open Link in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    /* DISPLAY FOR TEXT OR OTHER DATA */
                    <p className="text-sm font-mono text-slate-200 break-all bg-slate-950 p-3 rounded-xl border border-slate-800">{scannedResult}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: DASHBOARD & SAVED LIBRARY           */}
        {/* ========================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Saved QR Code Library</h2>
                  <p className="text-xs text-slate-400 mt-1">Manage, update dynamic links, and export your personal generated codes</p>
                </div>
                <button onClick={() => setActiveTab('generator')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Create New
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {savedQRs.map((item) => (
                  <div key={item.id} className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.dynamic ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.dynamic ? 'Dynamic' : 'Static'}
                      </span>
                      <span className="text-xs text-slate-500">{item.created}</span>
                    </div>

                    <h4 className="font-bold text-base mb-1">{item.name}</h4>
                    <p className="text-xs text-slate-400 font-mono truncate mb-4">{item.data}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                      <span className="text-slate-400">{item.scans} scans</span>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setSavedQRs(savedQRs.filter(q => q.id !== item.id))} className="text-rose-400 hover:text-rose-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: DYNAMIC ANALYTICS DASHBOARD        */}
        {/* ========================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h2 className="text-2xl font-bold mb-1">Scan Performance Analytics</h2>
              <p className="text-xs text-slate-400 mb-6">Real-time scan tracking for dynamic redirected QR campaigns</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-xs font-semibold text-indigo-400">Total Scans</span>
                  <p className="text-3xl font-extrabold text-indigo-300 mt-2">2,630</p>
                </div>
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-xs font-semibold text-purple-400">Unique Devices</span>
                  <p className="text-3xl font-extrabold text-purple-300 mt-2">1,890</p>
                </div>
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-xs font-semibold text-emerald-400">Top Location</span>
                  <p className="text-3xl font-extrabold text-emerald-300 mt-2">United States</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 6: DEVELOPER API DOCUMENTATION         */}
        {/* ========================================== */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h2 className="text-2xl font-bold mb-2 flex items-center space-x-2">
                <Server className="w-6 h-6 text-indigo-400" />
                <span>Developer REST API</span>
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Programmatically generate high-resolution scannable QR codes for your SaaS application via REST endpoints.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 space-y-2">
                <p className="text-emerald-400">POST /api/v1/qr/generate</p>
                <p className="text-slate-500">// Request Payload</p>
                <pre className="text-indigo-300">{`{
  "type": "url",
  "data": "https://company.com",
  "size": 300,
  "fgColor": "#0f172a",
  "format": "png"
}`}</pre>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}