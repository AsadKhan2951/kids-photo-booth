export default function ScreenCard({ screen, heading, subheading, children, footer }) {
  return (
    <div className="k-frame">
      <div className="flex justify-center mb-4">
        <span className="k-badge">Screen {screen}</span>
      </div>

      <div className="k-card">
        <div className="k-topbar">KIDS PHOTO BOOTH</div>

        <div className="border-t-4 border-slate-800" />

        <div className="k-section text-center">
          <div className="k-title">{heading}</div>
          {subheading ? <div className="k-subtitle">{subheading}</div> : null}
        </div>

        {children}

        {footer ? (
          <div className="px-6 pb-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
