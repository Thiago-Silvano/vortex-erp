# Project Memory

## Core
- Multi-tenant isolation is mandatory: always filter and write using `empresa_id`. Hydrate `activeCompany.id` before any UI write operation.
- Use `sale_date` as the absolute chronological index for all reports and list sorting.
- Monetary inputs in BRL use a dynamic 'R$ 0,00' mask and start empty. Numeric inputs must hide spinners via CSS.
- Global theme is dark (accent #5b5bd6). Layout shell uses LATERAL Sidebar (shadcn, 220px, collapsible="icon") + 48px topbar; no horizontal top menu. Inter 13px body, radius 7px (md).
- Premium PDFs continue using Neutral Dark/Gold palette independently from the UI theme.
- Names in the CRM must always be explicitly converted to uppercase.
- Financial calculation: `total_sale` always equals Cost + RAV (Lucro Bruto/Gross Profit).
- ThemeContext.applyThemeToDOM is neutralized: it stores `--theme-*` legacy vars only and never overrides global tokens (--primary, --background, etc).

## Memories
### System & Architecture
- [Supabase Integration](mem://backend/supabase-integration)
- [SMTP Delivery](mem://backend/smtp-delivery)
- [External DB Connectivity](mem://architecture/external-backend-connectivity)
- [WhatsApp Server Requirements](mem://architecture/whatsapp-server-requirements)
- [System Appearance](mem://ui/system-appearance-module) — ThemeContext now no-op for global tokens (Apr 2026 dark refresh)
- [Navigation & Layout](mem://ui/navigation-and-layout-philosophy) — Lateral Sidebar with collapsible groups, ⭐ favorites, last-accessed module persisted

### Authentication & Authorization
- [Session & Access](mem://auth/session-and-access)
- [Roles & Permissions](mem://auth/roles-and-permissions)

### CRM
- [Client Management](mem://crm/client-management)
- [Supplier Management](mem://crm/supplier-management)
- [Photo Capture](mem://crm/photo-capture)
- [Client Files](mem://crm/client-files)
- [Kanban Commercial Funnel](mem://crm/kanban-commercial-funnel)

### Sales & Proposals
- [Interactive Proposal](mem://sales/interactive-proposal)
- [Client Build Proposal](mem://sales/client-build-proposal)
- [Destination Image Editor](mem://sales/destination-image-editor)
- [Rich Text Formatting](mem://sales/rich-text-formatting)
- [Quotes Kanban View](mem://sales/quotes-kanban-view)
- [Quote Duplication](mem://sales/quote-duplication)
- [Quote Options Logic](mem://sales/quote-options-logic)
- [Quote Payment Options](mem://sales/quote-payment-options)
- [Passenger Registration](mem://sales/passenger-registration)
- [Pipeline Tracking](mem://sales/pipeline-and-tracking)
- [List View Controls](mem://sales/list-view-controls)
- [Invoice Status Badge](mem://sales/invoice-status-badge)
- [Cleanup and State Management](mem://sales/cleanup-and-state-management)
- [AI Tools Hub](mem://sales/ai-powered-tools-hub)

### Sales Workflows & Rules
- [Sales Workflow Active](mem://sales/workflow-and-persistence-active)
- [Progress Calculation Logic](mem://sales/progress-calculation-logic)
- [Item Deduplication](mem://sales/item-deduplication)
- [Service Editor](mem://sales/service-editor)
- [Service Image Search](mem://sales/service-image-search)
- [Google Hotel Search](mem://sales/google-hotel-search)
- [Flight Itinerary](mem://sales/flight-itinerary)
- [Flight Stopover Logic](mem://sales/flight-stopover-logic)
- [Airline Management](mem://features/airline-management)

### Finance & Payments
- [Payments & Pricing](mem://sales/payments-and-pricing)
- [Multi Payment Methods](mem://sales/multi-payment-methods)
- [Financial Generation Logic](mem://sales/financial-generation-logic)
- [Financial Balance Tracking](mem://sales/financial-balance-tracking)
- [Supplier Payment Workflow](mem://sales/supplier-payment-workflow)
- [Commission Payment Logic](mem://sales/commission-only-payment-logic)
- [Mixed Payment Adjustment](mem://finance/mixed-payment-adjustment)
- [Automated Installments](mem://finance/automated-installments)
- [Cost Centers](mem://finance/cost-centers)
- [Bank Reconciliation](mem://finance/bank-reconciliation)
- [Reconciliation Reclassification](mem://finance/reconciliation-reclassification-logic)
- [Transaction Management Logic](mem://finance/transaction-management-logic)
- [Group Accounts](mem://finance/group-accounts)
- [Report Classification Logic](mem://finance/report-classification-logic)
- [Interactive Reporting](mem://finance/interactive-reporting)

### Vouchers & Documents
- [Vouchers Management](mem://sales/vouchers-management-page)
- [Voucher Content Rules](mem://sales/voucher-content-rules)
- [Voucher Branding](mem://sales/voucher-branding)
- [Voucher Air Services](mem://sales/voucher-additional-air-services)
- [PDF Generation Premium Style](mem://sales/pdf-generation-premium-style)

### WhatsApp Integration
- [UI Design Pattern](mem://whatsapp/ui-design-pattern)
- [Mobile Experience](mem://whatsapp/mobile-experience)
- [Session Control](mem://whatsapp/session-control)
- [Connection Resilience](mem://whatsapp/connection-resilience)
- [Header Actions & Search](mem://whatsapp/header-actions-and-search)
- [Message Management](mem://whatsapp/message-management)
- [Technical Integration](mem://whatsapp/integration-technical)
- [CRM Linking](mem://whatsapp/crm-and-supplier-linking)
- [vCard Handling](mem://whatsapp/vcard-handling)
- [Popup Blocker Bypass Strategy](mem://whatsapp/popup-blocker-bypass-strategy)
- [Notifications](mem://whatsapp/notifications)
- [Conversation Labeling](mem://whatsapp/conversation-labeling)

### Visas (Vistos)
- [Sales Form](mem://vistos/sales-form)
- [DS-160 Management Logic](mem://vistos/ds-160-management-logic)
- [Dashboard Reporting](mem://vistos/dashboard-reporting)
- [Payment Integration](mem://vistos/payment-integration)
- [Multi-service Logic](mem://vistos/multi-service-logic)
- [Visa Alerts](mem://notifications/visa-alerts)

### Itineraries (Roteiros)
- [Itinerary Module](mem://features/itinerary-module)
- [Itinerary Map Logic](mem://features/itinerary-map-logic)
- [Image Positioning](mem://features/itinerary-image-positioning)
- [Editor Workflow](mem://features/itinerary-editor-workflow)

### Marketing & Promotions
- [Promotions Management](mem://marketing/promotions-and-management)
- [Promo Catalog Editor](mem://marketing/promotion-catalog-and-editor)
- [Promo Maker](mem://features/promo-maker)
- [AI Creative Engine](mem://marketing/ai-creative-engine)

### Other Features
- [Contracts & Signatures](mem://features/contracts-and-signatures)
- [Shared Contract SMTP](mem://features/shared-contract-smtp)
- [Event Management](mem://calendar/event-management)
- [Reservations & Alerts](mem://reservations/management-and-alerts)
- [Omnichannel Inbox](mem://email/omnichannel-inbox-architecture)
- [Reports & Export](mem://reports/modules-and-export)
- [Dashboard Commercial Metrics](mem://dashboard/commercial-metrics)
- [NFS-e National Integration](mem://features/nfse-national-integration)
- [NFS-e Data Filling](mem://sales/nfse-data-filling)
- [Sellers Commissions](mem://sellers/commissions-and-rules)
- [Commission Rules](mem://sellers/commission-calculation-rules)
