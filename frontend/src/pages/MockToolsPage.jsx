import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Mail,
  Folder,
  Globe,
  CreditCard,
  RotateCcw,
  RefreshCw,
  Send,
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { JSONViewer } from '../components/common/JSONViewer';
import {
  listEmails,
  sendEmail,
  listFiles,
  readFileContent,
  writeFileContent,
  listBrowserPages,
  openBrowserPage,
  listPayments,
  createPaymentRequest,
  resetMockEnvironment
} from '../api/tools';

export function MockToolsPage() {
  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'files' | 'browser' | 'payments'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Email State
  const [emails, setEmails] = useState([]);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Files State
  const [files, setFiles] = useState([]);
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [newFilePath, setNewFilePath] = useState('sandbox/notes.txt');
  const [newFileContent, setNewFileContent] = useState('Confidential test note inside sandbox.');

  // Browser State
  const [pages, setPages] = useState([]);
  const [openedPage, setOpenedPage] = useState(null);

  // Payments State
  const [payments, setPayments] = useState([]);
  const [payRecipient, setPayRecipient] = useState('supplier@verified-partner.com');
  const [payAmount, setPayAmount] = useState('500.00');
  const [payDesc, setPayDesc] = useState('Quarterly security software license');

  const loadTabData = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (activeTab === 'email') {
      const res = await listEmails('inbox', 50, 0);
      if (res.ok && res.data) setEmails(res.data.messages || []);
      else setError(res.error || 'Failed to list emails');
    } else if (activeTab === 'files') {
      const res = await listFiles();
      if (res.ok && res.data) setFiles(res.data.files || []);
      else setError(res.error || 'Failed to list files');
    } else if (activeTab === 'browser') {
      const res = await listBrowserPages();
      if (res.ok && res.data) setPages(res.data.pages || []);
      else setError(res.error || 'Failed to list browser pages');
    } else if (activeTab === 'payments') {
      const res = await listPayments(null, 50, 0);
      if (res.ok && res.data) setPayments(res.data.payments || []);
      else setError(res.error || 'Failed to list payments');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await sendEmail({ to: emailTo, subject: emailSubject, body: emailBody });
    if (res.ok) {
      setSuccessMsg('Email successfully transmitted to mock inbox!');
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      await loadTabData();
    } else {
      setError(res.error || 'Failed to send mock email (RBAC/Policy block)');
    }
  };

  const handleReadFile = async (path) => {
    setError(null);
    const res = await readFileContent(path);
    if (res.ok && res.data) {
      setSelectedFilePath(path);
      setSelectedFileContent(res.data.content);
    } else {
      setError(res.error || `Access Denied to file: ${path}`);
    }
  };

  const handleWriteFile = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await writeFileContent(newFilePath, newFileContent);
    if (res.ok) {
      setSuccessMsg(`File '${newFilePath}' created in sandbox.`);
      await loadTabData();
    } else {
      setError(res.error || 'File write rejected by PolicyValidator');
    }
  };

  const handleOpenPage = async (pageId) => {
    setError(null);
    const res = await openBrowserPage(pageId);
    if (res.ok && res.data) {
      setOpenedPage(res.data);
    } else {
      setError(res.error || 'Failed to open web page');
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await createPaymentRequest({
      recipient: payRecipient,
      amount: parseFloat(payAmount) || 0,
      currency: 'USD',
      description: payDesc,
    });
    if (res.ok) {
      setSuccessMsg('Mock payment request initiated.');
      await loadTabData();
    } else {
      setError(res.error || 'Payment creation denied by policy');
    }
  };

  const handleResetEnvironment = async () => {
    if (!window.confirm('Reset all mock cyber tools to default seed state?')) return;
    const res = await resetMockEnvironment();
    if (res.ok) {
      setSuccessMsg('All mock cyber tools have been reset to seed state.');
      await loadTabData();
    } else {
      setError(res.error || 'Reset failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            Mock Cyber Infrastructure & Tools Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Explore isolated mock tools (Email, Filesystem, Browser, Payments). Zero live financial or external connections.
          </p>
        </div>
        <button
          onClick={handleResetEnvironment}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Environment</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tool Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'email', label: 'Email Inbox', icon: Mail },
          { id: 'files', label: 'Filesystem Sandbox', icon: Folder },
          { id: 'browser', label: 'Web Browser Pages', icon: Globe },
          { id: 'payments', label: 'Payment Ledger', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-navy-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Email Tool */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase">Simulated Inbox Messages ({emails.length})</span>
            {emails.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Inbox is empty.</p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {emails.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-blue-400 font-bold">{m.from_addr || m.sender}</span>
                      <span className="text-slate-400">{m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : 'N/A'}</span>
                    </div>
                    <div className="text-xs font-semibold text-white">{m.subject}</div>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono bg-navy-900/60 p-2 rounded">
                      {m.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase">Transmit Mock Email</span>
            <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">To</label>
                <input
                  type="email"
                  required
                  placeholder="analyst@internal.corp"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Weekly Status Update"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Body</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Inert message body text..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Email</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Filesystem Tool */}
      {activeTab === 'files' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase">Virtual File Catalog ({files.length})</span>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((f) => (
                <div
                  key={f.path}
                  className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-white font-semibold">{f.path}</span>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Badge variant={f.tier}>{f.tier}</Badge>
                      <span>{f.size_bytes} bytes</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReadFile(f.path)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold text-xs"
                  >
                    Read
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {selectedFileContent !== null && (
              <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-2">
                <span className="text-xs font-bold text-cyan-400 uppercase font-mono">Content: {selectedFilePath}</span>
                <pre className="p-3 rounded-xl bg-navy-950 border border-slate-850 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedFileContent}
                </pre>
              </div>
            )}

            <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase">Write to Sandbox File</span>
              <form onSubmit={handleWriteFile} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Path (Sandbox only)</label>
                  <input
                    type="text"
                    value={newFilePath}
                    onChange={(e) => setNewFilePath(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Content</label>
                  <textarea
                    rows="2"
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition"
                >
                  Write Virtual File
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Browser Tool */}
      {activeTab === 'browser' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase">Registered Mock Web Pages</span>
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {pages.map((p) => (
                <div
                  key={p.page_id}
                  className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-cyan-400 font-bold">{p.page_id}</span>
                    <button
                      onClick={() => handleOpenPage(p.page_id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold"
                    >
                      Open
                    </button>
                  </div>
                  <div className="font-semibold text-white">{p.title}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">{p.url}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase">Simulated Browser Viewport</span>
            {openedPage ? (
              <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono">
                  <span className="text-slate-400">{openedPage.url}</span>
                  <Badge variant="SAFE">Inert Content</Badge>
                </div>
                <h4 className="text-sm font-bold text-white">{openedPage.title}</h4>
                <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto p-2 bg-navy-900 rounded border border-slate-850">
                  {openedPage.content}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400">
                Click 'Open' on any simulated web page to view its inert content. Real outbound network calls are forbidden.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Payments Tool */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase">Mock Payment Transactions ({payments.length})</span>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No payment transactions recorded.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {payments.map((tx) => (
                  <div
                    key={tx.transaction_id || tx.id}
                    className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-bold">{tx.transaction_id || tx.id}</span>
                        <Badge variant={tx.status}>{tx.status}</Badge>
                      </div>
                      <div className="text-slate-300">{tx.description}</div>
                      <div className="text-[11px] font-mono text-slate-400">To: {tx.recipient}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-white text-sm">
                      ${tx.amount?.toFixed(2)} {tx.currency || 'USD'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-navy-900 border border-slate-800 p-5 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase">Simulate Payment Request</span>
            <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Recipient</label>
                <input
                  type="text"
                  required
                  value={payRecipient}
                  onChange={(e) => setPayRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-white focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Note: Payments &gt; $1,000 automatically trigger Blue Team Guardian interception and require human authorization.
              </p>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition flex items-center justify-center gap-2"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Submit Payment Request</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

