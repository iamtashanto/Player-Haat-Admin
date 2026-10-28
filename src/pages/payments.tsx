import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FilterSelect, Toolbar } from '@/components/data/filters'
import { PagedTable, type Column } from '@/components/data/paged-table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, ReasonDialog } from '@/components/ui/dialog'
import { Card, Input, Label } from '@/components/ui/form'
import { useAuth } from '@/auth/auth-context'
import { api } from '@/lib/api'
import { useAction, usePaged } from '@/lib/queries'
import { ago, fmtMoney, fmtNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/pages/shared'

interface Payment {
  id: string; status: string; method: string; packCode: string; credits: number; amountBdt: number; trxId: string | null; senderNumber: string | null; reviewNote: string | null
  user: { id: string; name: string; email: string | null; phone: string | null }; createdAt: string; reviewedAt: string | null
}
interface Pack { id: string; code: string; credits: number; priceBdt: number; isActive: boolean; order: number }

function PaymentsTab() {
  const { can } = useAuth()
  const [status, setStatus] = useState('SUBMITTED')
  const [approve, setApprove] = useState<Payment | null>(null)
  const [reject, setReject] = useState<Payment | null>(null)
  const list = usePaged<Payment>('/admin/payments', { status })
  const done = { invalidate: [['paged'], ['stats']] }
  const approveIt = useAction((id: string) => api.post(`/admin/payments/${id}/approve`), { success: 'Approved — credits added', ...done })
  const rejectIt = useAction((v: { id: string; note: string }) => api.post(`/admin/payments/${v.id}/reject`, { note: v.note }), { success: 'Rejected', ...done })

  const columns: Column<Payment>[] = [
    { header: 'Customer', cell: (p) => <div><Link to={`/users/${p.user.id}`} className="font-medium hover:underline">{p.user.name}</Link><p className="text-xs text-muted-foreground">{p.user.phone ?? p.user.email ?? '—'}</p></div> },
    { header: 'Order', cell: (p) => <div><p className="font-medium">{fmtMoney(p.amountBdt)} <span className="font-normal text-muted-foreground">· {fmtNumber(p.credits)} credits</span></p><p className="text-xs text-muted-foreground">{p.packCode} · {ago(p.createdAt)}</p></div> },
    { header: 'Paid with', cell: (p) => <div><Badge>{p.method.charAt(0) + p.method.slice(1).toLowerCase()}</Badge><p className="mt-1 font-mono text-xs">{p.trxId ?? 'no transaction id yet'}</p>{p.senderNumber && <p className="text-xs text-muted-foreground">from {p.senderNumber}</p>}</div> },
    { header: 'Status', cell: (p) => <div><StatusBadge status={p.status} />{p.reviewNote && <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">{p.reviewNote}</p>}</div> },
    { header: '', className: 'text-right', cell: (p) => p.status === 'SUBMITTED' && can('payments.review') && <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setReject(p)}>Reject</Button><Button size="sm" onClick={() => setApprove(p)}>Approve</Button></div> },
  ]
  return (
    <>
      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[['SUBMITTED', 'Waiting for me'], ['PENDING', 'Not paid yet'], ['PAID', 'Approved'], ['REJECTED', 'Rejected'], ['ALL', 'All']]} />
      </Toolbar>
      <PagedTable columns={columns} items={list.items} loading={list.loading} fetching={list.fetching} error={list.error} hasMore={!!list.hasMore} loadingMore={list.loadingMore} onLoadMore={list.loadMore} onRetry={list.reload} empty={status === 'SUBMITTED' ? 'No payments are waiting.' : 'Nothing here.'} />

      <Dialog open={approve !== null} onClose={() => setApprove(null)} title="Approve this payment?" description="Compare the transaction ID and amount with your bKash / Nagad / Rocket statement first. Credits are added once and can't be added twice.">
        {approve && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-sm">
              <dt className="text-muted-foreground">Amount</dt><dd className="font-semibold">{fmtMoney(approve.amountBdt)}</dd>
              <dt className="text-muted-foreground">Method</dt><dd>{approve.method}</dd>
              <dt className="text-muted-foreground">Transaction ID</dt><dd className="font-mono">{approve.trxId}</dd>
              <dt className="text-muted-foreground">Sent from</dt><dd>{approve.senderNumber}</dd>
              <dt className="text-muted-foreground">Credits</dt><dd>{fmtNumber(approve.credits)} to {approve.user.name}</dd>
            </dl>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApprove(null)}>Cancel</Button>
              <Button disabled={approveIt.isPending} onClick={async () => { await approveIt.mutateAsync(approve.id).catch(() => undefined); setApprove(null) }}>Add {fmtNumber(approve.credits)} credits</Button>
            </div>
          </div>
        )}
      </Dialog>
      <ReasonDialog open={reject !== null} onClose={() => setReject(null)} title="Reject this payment?" description="Say why (e.g. no such transaction, wrong amount). The customer is told it couldn't be verified and can see your note." label="Note" confirmLabel="Reject" destructive onConfirm={(note) => rejectIt.mutateAsync({ id: reject!.id, note })} />
    </>
  )
}

function PacksTab() {
  const packs = useQuery({ queryKey: ['credit-packs'], queryFn: async () => (await api.get<Pack[]>('/admin/credit-packs')).data })
  const [edit, setEdit] = useState<Pack | 'new' | null>(null)
  const [form, setForm] = useState({ code: '', credits: '10', priceBdt: '99', order: '0', isActive: true })
  const open = (p: Pack | 'new') => {
    setForm(p === 'new' ? { code: '', credits: '10', priceBdt: '99', order: '0', isActive: true } : { code: p.code, credits: String(p.credits), priceBdt: String(p.priceBdt), order: String(p.order), isActive: p.isActive })
    setEdit(p)
  }
  const save = useAction(
    async () => {
      const body = { credits: Number(form.credits), priceBdt: Number(form.priceBdt), order: Number(form.order), isActive: form.isActive }
      return edit === 'new' ? api.post('/admin/credit-packs', { code: form.code, ...body }) : api.put(`/admin/credit-packs/${(edit as Pack).id}`, body)
    },
    { success: 'Saved', invalidate: [['credit-packs']] },
  )
  const valid = Number(form.credits) >= 1 && Number(form.priceBdt) >= 1 && (edit !== 'new' || /^[A-Za-z0-9_]{2,20}$/.test(form.code))
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">What customers can buy. Changing a pack never changes an order already placed.</p>
        <Button size="sm" onClick={() => open('new')}>New pack</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {packs.data?.map((p) => (
          <Card key={p.id} className={cn('p-5', !p.isActive && 'opacity-60')}>
            <div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.code}</p><p className="mt-1 text-2xl font-bold">{fmtNumber(p.credits)} <span className="text-sm font-normal text-muted-foreground">credits</span></p></div>{!p.isActive && <Badge>Hidden</Badge>}</div>
            <p className="mt-2 text-lg font-semibold text-primary">{fmtMoney(p.priceBdt)}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => open(p)}>Edit</Button>
          </Card>
        ))}
      </div>
      <Dialog open={edit !== null} onClose={() => setEdit(null)} title={edit === 'new' ? 'New credit pack' : `Edit ${form.code}`}>
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (!valid) return; await save.mutateAsync(undefined).then(() => setEdit(null)).catch(() => undefined) }}>
          {edit === 'new' && <div><Label htmlFor="code">Code</Label><Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1" placeholder="STARTER" maxLength={20} /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="credits">Credits</Label><Input id="credits" type="number" min={1} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} className="mt-1" /></div>
            <div><Label htmlFor="price">Price (৳)</Label><Input id="price" type="number" min={1} value={form.priceBdt} onChange={(e) => setForm({ ...form, priceBdt: e.target.value })} className="mt-1" /></div>
            <div><Label htmlFor="order">Order</Label><Input id="order" type="number" min={0} value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="mt-1" /></div>
            <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />For sale</label>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button type="submit" disabled={!valid || save.isPending}>Save</Button></div>
        </form>
      </Dialog>
    </>
  )
}

export default function PaymentsPage() {
  const { can } = useAuth()
  const [tab, setTab] = useState<'payments' | 'packs'>('payments')
  return (
    <div className="animate-fade-up">
      <PageHeader title="Payments & credits" description="Customers pay by bKash, Nagad or Rocket and send the transaction ID. Check it against your statement, then approve." />
      <div className="mb-4 inline-flex rounded-lg border bg-card p-1 text-sm">
        {(['payments', ...(can('packs.manage') ? (['packs'] as const) : [])] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('rounded-md px-4 py-1.5 font-medium capitalize', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{t === 'packs' ? 'Credit packs' : 'Payments'}</button>
        ))}
      </div>
      {tab === 'payments' ? <PaymentsTab /> : <PacksTab />}
    </div>
  )
}
