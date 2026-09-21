-- AlterTable
-- Колонки NOT NULL без дефолта не встали бы на уже существующие панели, поэтому
-- добавляем с временным дефолтом, заполняем им старые строки и дефолт снимаем:
-- дальше значения всегда приходят из сценария.
ALTER TABLE "Panel" ADD COLUMN "shotType" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN "cameraAngle" TEXT NOT NULL DEFAULT 'eye-level';

ALTER TABLE "Panel" ALTER COLUMN "shotType" DROP DEFAULT,
ALTER COLUMN "cameraAngle" DROP DEFAULT;
