import { getTranslations } from 'next-intl/server';

export default async function AboutPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
    await params;
    const t = await getTranslations('About');

    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-4xl font-bold mb-6">{t('title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {t('content')}
        </p>
      </div>
    );
  }