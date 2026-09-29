-- Пароль нужен credentials-входу. Колонка nullable: у сида dev@local хеша нет.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
