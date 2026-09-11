export const metadata = {
  title: "GlukoTrack",
  description: "Catatan gula darah & aktivitas harian",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
