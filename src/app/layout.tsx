import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jグランツ補助金検索ボット',
  description: 'Jグランツの補助金情報を自然言語で検索できるチャットボット',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
