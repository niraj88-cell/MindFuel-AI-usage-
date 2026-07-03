export default function MaintenancePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: '#FAF8F4',
      color: '#23201B',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>
        Back soon
      </h1>
      <p style={{ color: '#6F6A61', maxWidth: '400px' }}>
        SatyaShift is being upgraded. We&apos;ll be back shortly.
        Thank you for your patience.
      </p>
    </div>
  )
}
