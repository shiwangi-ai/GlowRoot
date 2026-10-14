-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "pincode" TEXT,
    "password_hash" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_orders" (
    "id" CITEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" CITEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_address" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "plan_slug" TEXT,
    "status" TEXT NOT NULL,
    "total_inr" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "delivery_date" TEXT NOT NULL,
    "delivery_slot" TEXT,
    "delivery_pincode" TEXT,
    "partner_id" TEXT,
    "payment" JSONB,
    "history" JSONB,

    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sessions" (
    "token_hash" VARCHAR(64) NOT NULL,
    "customer_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "user_agent" TEXT,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("token_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customer_orders_customer_id_created_at_idx" ON "customer_orders"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_orders_status_delivery_date_idx" ON "customer_orders"("status", "delivery_date");

-- CreateIndex
CREATE INDEX "customer_sessions_customer_id_idx" ON "customer_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "customer_sessions_expires_at_idx" ON "customer_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Keep the legacy Owner role ID and assignments; display it as Super Admin.
UPDATE admin_roles SET name = 'Super Admin' WHERE key = 'owner';
INSERT INTO admin_roles (id, key, name, description, is_system_role, requires_mfa, created_at, updated_at)
VALUES (gen_random_uuid(), 'admin', 'Admin', 'Manages customers and day-to-day business operations.', true, true, now(), now())
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, now() FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.key = 'admin' AND p.module NOT IN ('staff', 'audit') AND p.key <> 'settings.manage'
ON CONFLICT DO NOTHING;
DELETE FROM admin_role_permissions rp USING admin_roles r, admin_permissions p
WHERE rp.role_id = r.id AND rp.permission_id = p.id
AND r.key NOT IN ('owner', 'super-admin', 'admin')
AND (p.module = 'customers' OR p.key = 'orders.view_delivery_details');
