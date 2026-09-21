import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SHOWCASE_IDEA =
  'Кот-детектив расследует пропажу золотой рыбки в неоновом мегаполисе.';

const PANELS = [
  {
    order: 1,
    caption: 'Ночной дождь. Кот в плаще смотрит на пустой аквариум.',
    imagePrompt:
      'Noir neon city, anthropomorphic detective cat in a trench coat, empty fishbowl, rain, cinematic lighting',
    shotType: 'establishing',
    cameraAngle: 'eye-level',
  },
  {
    order: 2,
    caption: 'На мокром асфальте — одна золотая чешуйка и след лапы.',
    imagePrompt:
      'Close-up of wet neon pavement, single gold fish scale, paw print, detective cat inspecting, moody',
    shotType: 'insert',
    cameraAngle: 'high-angle',
  },
  {
    order: 3,
    caption: 'В подводном баре рыбы делают вид, что ничего не знают.',
    imagePrompt:
      'Underground speakeasy aquarium bar, fish patrons, detective cat at the counter, neon signs, comic panel',
    shotType: 'medium',
    cameraAngle: 'dutch-angle',
  },
  {
    order: 4,
    caption: 'Рыбка нашлась: она сама ушла искать приключения.',
    imagePrompt:
      'Goldfish in tiny leather jacket on a scooter, detective cat tipping his hat, neon city background, happy ending',
    shotType: 'wide',
    cameraAngle: 'eye-level',
  },
] as const;

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'dev@local' },
    update: {},
    create: {
      email: 'dev@local',
      name: 'Local Dev',
      quota: { create: {} },
    },
  });

  const existing = await prisma.story.findFirst({
    where: { userId: user.id, isShowcase: true },
  });

  if (existing) {
    return;
  }

  await prisma.story.create({
    data: {
      userId: user.id,
      idea: SHOWCASE_IDEA,
      title: 'Дело о золотой рыбке',
      styleId: 'noir-neon',
      quality: 'DRAFT',
      status: 'SCRIPT_READY',
      isShowcase: true,
      panels: {
        create: PANELS.map((panel) => ({
          ...panel,
          status: 'PENDING',
        })),
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
