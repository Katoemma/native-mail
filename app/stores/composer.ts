import { defineStore } from 'pinia'
import type { MailAddress, AttachmentDraft, DraftPayload } from '../../shared/types'

interface ComposerState {
  open: boolean
  draftId: string | null
  to: MailAddress[]
  cc: MailAddress[]
  bcc: MailAddress[]
  subject: string
  body: string
  attachments: AttachmentDraft[]
  /** Reply/forward context */
  inReplyToEmailId: string | null
  threadId: string | null
  mode: 'compose' | 'reply' | 'replyAll' | 'forward'
  saving: boolean
  sending: boolean
  error: string | null
  lastSavedAt: number | null
}

export const useComposerStore = defineStore('composer', {
  state: (): ComposerState => ({
    open: false,
    draftId: null,
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body: '',
    attachments: [],
    inReplyToEmailId: null,
    threadId: null,
    mode: 'compose',
    saving: false,
    sending: false,
    error: null,
    lastSavedAt: null,
  }),

  getters: {
    readyToSend: (state) =>
      state.to.length > 0 && state.subject.trim().length > 0 && !state.sending,

    uploadedAttachments: (state) =>
      state.attachments
        .filter((a): a is AttachmentDraft & { blobId: string } => Boolean(a.blobId))
        .map(a => ({
          blobId: a.blobId,
          name: a.name,
          type: a.type || 'application/octet-stream',
          size: a.size,
        })),
  },

  actions: {
    /** Append Identity textSignature (Stalwart) if not already present. */
    async applySignature() {
      try {
        const { identities } = await $fetch<{ identities: { textSignature?: string }[] }>(
          '/api/identity',
        )
        const sig = identities[0]?.textSignature?.trimEnd() ?? ''
        if (!sig) return
        // Avoid duplicating if draft already contains this signature block
        if (this.body.includes(sig)) return
        const block = `\n\n-- \n${sig}`
        if (this.mode === 'forward' && this.body.startsWith('\n\n---------- Forwarded')) {
          this.body = `${block}${this.body}`
        }
        else {
          this.body = `${this.body}${block}`
        }
      }
      catch {
        // Non-fatal — compose still works without a signature
      }
    },

    async openCompose() {
      this.$reset()
      this.open = true
      this.mode = 'compose'
      await this.applySignature()
    },

    async openReply(email: { id: string; threadId: string; from: MailAddress[]; subject: string }) {
      this.$reset()
      this.open = true
      this.mode = 'reply'
      this.inReplyToEmailId = email.id
      this.threadId = email.threadId
      this.to = [...email.from]
      this.subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
      await this.applySignature()
    },

    async openReplyAll(email: {
      id: string
      threadId: string
      from: MailAddress[]
      to: MailAddress[]
      cc: MailAddress[]
      subject: string
    }) {
      await this.openReply(email)
      this.mode = 'replyAll'
      this.cc = [...email.to, ...email.cc]
    },

    async openForward(email: { id: string; threadId: string; subject: string; body?: string }) {
      this.$reset()
      this.open = true
      this.mode = 'forward'
      this.inReplyToEmailId = email.id
      this.threadId = email.threadId
      this.subject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`
      if (email.body) this.body = `\n\n---------- Forwarded message ----------\n${email.body}`
      await this.applySignature()
    },

    close() {
      this.open = false
    },

    async saveDraft(opts: { allowEmpty?: boolean } = {}) {
      if (this.saving) return

      const empty =
        !this.to.length
        && !this.cc.length
        && !this.bcc.length
        && !this.subject.trim()
        && !this.body.trim()
        && !this.uploadedAttachments.length

      // Never persist blank drafts (autosave after $reset used to do this)
      if (empty && !opts.allowEmpty) return

      this.saving = true
      this.error = null
      try {
        const payload: DraftPayload = {
          to:               this.to,
          cc:               this.cc,
          bcc:              this.bcc,
          subject:          this.subject,
          textBody:         this.body,
          attachments:      this.uploadedAttachments,
          inReplyToEmailId: this.inReplyToEmailId ?? undefined,
        }

        if (this.draftId) {
          // Delete old draft and recreate — JMAP bodyValues patching is complex.
          // This ensures subject, body, and recipients are always in sync.
          await $fetch(`/api/emails/${this.draftId}`, { method: 'DELETE' }).catch(() => {})
          this.draftId = null
        }

        const res = await $fetch<{ emailId: string }>('/api/drafts', {
          method: 'POST',
          body:   payload,
        })
        this.draftId = res.emailId
        this.lastSavedAt = Date.now()
      }
      catch (err: unknown) {
        this.error = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Save failed'
      }
      finally {
        this.saving = false
      }
    },

    async send() {
      if (!this.readyToSend) return
      this.sending = true
      this.error = null
      try {
        // Always (re)create the draft with the latest content before sending.
        // This guarantees the From, To, Subject, and body are all correct.
        await this.saveDraft()
        if (!this.draftId) throw new Error('Could not create draft before sending')

        const sentId = this.draftId
        await $fetch(`/api/emails/${sentId}/send`, { method: 'POST' })
        this.open = false
        this.$reset()
      }
      catch (err: unknown) {
        this.error = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Send failed'
        this.sending = false
      }
      finally {
        this.sending = false
      }
    },

    /** Inline reply from the viewer — does not open the floating composer. */
    async quickReply(
      email: { id: string; threadId: string; from: MailAddress[]; subject: string },
      body: string,
    ) {
      const text = body.trim()
      if (!text) return

      this.$reset()
      this.mode = 'reply'
      this.inReplyToEmailId = email.id
      this.threadId = email.threadId
      this.to = [...email.from]
      this.subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
      this.body = text
      this.open = false

      this.sending = true
      this.error = null
      try {
        await this.saveDraft()
        if (!this.draftId) throw new Error('Could not create draft before sending')
        await $fetch(`/api/emails/${this.draftId}/send`, { method: 'POST' })
        this.$reset()
      }
      catch (err: unknown) {
        this.error = (err as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Send failed'
        throw err
      }
      finally {
        this.sending = false
      }
    },

    async addAttachment(file: File) {
      const clientId = `${Date.now()}-${file.name}`
      const draft: AttachmentDraft = {
        clientId,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        uploading: true,
      }
      this.attachments.push(draft)

      try {
        // Send the File blob directly — avoid ArrayBuffer/ofetch text coercion
        const res = await $fetch<{ blobId: string; name: string; size: number; type: string }>(
          '/api/attachments/upload',
          {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'X-File-Name': encodeURIComponent(file.name),
            },
            body: file,
          },
        )
        const idx = this.attachments.findIndex(a => a.clientId === clientId)
        if (idx !== -1) {
          this.attachments[idx] = { ...this.attachments[idx], blobId: res.blobId, uploading: false }
        }
      }
      catch (err: unknown) {
        const idx = this.attachments.findIndex(a => a.clientId === clientId)
        if (idx !== -1) {
          this.attachments[idx] = {
            ...this.attachments[idx],
            uploading: false,
            error: 'Upload failed',
          }
        }
      }
    },

    removeAttachment(clientId: string) {
      this.attachments = this.attachments.filter(a => a.clientId !== clientId)
    },
  },
})
