-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT,
    "phone" VARCHAR(256),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
