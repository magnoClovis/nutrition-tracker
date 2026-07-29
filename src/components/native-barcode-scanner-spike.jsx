const CAMERA_RATIONALE =
  'A Phrona usa a câmera somente enquanto este teste estiver aberto para identificar o número do código de barras. Nenhuma foto ou vídeo é salvo ou enviado.';

const panelStyle = {
  position: 'fixed',
  inset: 16,
  zIndex: 2147483647,
  maxWidth: 480,
  height: 'fit-content',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  margin: 'auto',
  padding: 18,
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'rgba(15, 23, 20, 0.97)',
  color: '#f5f7f5',
  boxShadow: '0 18px 70px rgba(0,0,0,0.5)',
  fontFamily: "system-ui, 'Segoe UI', sans-serif",
};

const buttonStyle = {
  border: '1px solid rgba(255,255,255,0.24)',
  borderRadius: 10,
  padding: '11px 14px',
  background: '#185c42',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

function messageForPhase(phase) {
  switch (phase) {
    case 'checking':
      return 'Verificando câmera e permissão…';
    case 'needs-permission':
      return CAMERA_RATIONALE;
    case 'starting':
      return 'Abrindo a câmera nativa…';
    case 'scanning':
      return 'Aponte a câmera para um código EAN, UPC ou Code 128.';
    case 'cancelled':
      return 'Leitura cancelada. A câmera foi encerrada.';
    case 'denied':
      return 'Permissão de câmera negada. Você pode autorizá-la nas configurações do Android.';
    case 'unsupported':
      return 'Este aparelho não informou suporte a câmera.';
    default:
      return 'Este painel não consulta produtos e não grava nenhum dado.';
  }
}

export function createNativeBarcodeScannerSpikePanel({
  React,
  scanner,
  documentObject,
}) {
  if (!React || !scanner || !documentObject) {
    throw new TypeError('Native scanner spike panel requires React, scanner, and document');
  }

  return function NativeBarcodeScannerSpikePanel() {
    const [open, setOpen] = React.useState(false);
    const [phase, setPhase] = React.useState('idle');
    const [result, setResult] = React.useState(null);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [torchAvailable, setTorchAvailable] = React.useState(false);
    const [torchEnabled, setTorchEnabled] = React.useState(false);
    const settledRef = React.useRef(false);
    const activeRef = React.useRef(false);

    const setCameraSurfaceActive = React.useCallback(active => {
      documentObject.documentElement.classList.toggle('phrona-native-scanner-spike-active', active);
      documentObject.body.classList.toggle('phrona-native-scanner-spike-active', active);
      activeRef.current = active;
    }, []);

    const cancelScan = React.useCallback(async (reason = 'cancelled') => {
      settledRef.current = true;
      try {
        await scanner.stop();
      } finally {
        setCameraSurfaceActive(false);
        setTorchEnabled(false);
        setPhase(reason);
      }
    }, [setCameraSurfaceActive]);

    React.useEffect(() => {
      if (!scanner.isAvailable()) return undefined;
      const handleVisibilityChange = () => {
        if (documentObject.hidden && activeRef.current) {
          void cancelScan('cancelled');
        }
      };
      documentObject.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        documentObject.removeEventListener('visibilitychange', handleVisibilityChange);
        setCameraSurfaceActive(false);
        void scanner.stop();
      };
    }, [cancelScan, setCameraSurfaceActive]);

    if (!scanner.isAvailable()) return null;

    async function startCamera() {
      setErrorMessage('');
      setResult(null);
      setPhase('starting');
      setCameraSurfaceActive(true);
      settledRef.current = false;

      try {
        await scanner.start({
          onDetected(detected) {
            settledRef.current = true;
            setCameraSurfaceActive(false);
            setTorchEnabled(false);
            setResult(detected);
            setPhase('result');
          },
          onError(error) {
            settledRef.current = true;
            setCameraSurfaceActive(false);
            setTorchEnabled(false);
            setErrorMessage(error.message || String(error));
            setPhase('error');
          },
        });
        if (settledRef.current) return;
        const torch = await scanner.isTorchAvailable();
        setTorchAvailable(Boolean(torch?.available));
        setPhase('scanning');
      } catch (error) {
        setCameraSurfaceActive(false);
        setErrorMessage(error.message || String(error));
        setPhase('error');
      }
    }

    async function inspectPermission() {
      setPhase('checking');
      setErrorMessage('');
      setResult(null);
      try {
        const support = await scanner.isSupported();
        if (!support?.supported) {
          setPhase('unsupported');
          return;
        }
        const permission = await scanner.checkPermissions();
        if (permission?.camera === 'granted' || permission?.camera === 'limited') {
          await startCamera();
        } else if (permission?.camera === 'denied') {
          setPhase('denied');
        } else {
          setPhase('needs-permission');
        }
      } catch (error) {
        setErrorMessage(error.message || String(error));
        setPhase('error');
      }
    }

    async function requestPermissionAndStart() {
      setPhase('checking');
      try {
        const permission = await scanner.requestPermissions();
        if (permission?.camera === 'granted' || permission?.camera === 'limited') {
          await startCamera();
        } else {
          setPhase('denied');
        }
      } catch (error) {
        setErrorMessage(error.message || String(error));
        setPhase('error');
      }
    }

    async function toggleTorch() {
      try {
        await scanner.toggleTorch();
        const status = await scanner.isTorchEnabled();
        setTorchEnabled(Boolean(status?.enabled));
      } catch (error) {
        setErrorMessage(error.message || String(error));
      }
    }

    async function closePanel() {
      if (activeRef.current) await cancelScan();
      setOpen(false);
      setPhase('idle');
      setResult(null);
      setErrorMessage('');
    }

    if (!open) {
      return (
        <div className="phrona-native-scanner-spike">
          <button
            type="button"
            className="phrona-native-scanner-spike-launcher"
            onClick={() => setOpen(true)}
          >
            Testar scanner nativo
          </button>
        </div>
      );
    }

    const scanning = phase === 'starting' || phase === 'scanning';
    return (
      <div className={`phrona-native-scanner-spike${scanning ? ' is-scanning' : ''}`}>
        {scanning ? <div className="phrona-native-scanner-spike-target" aria-hidden="true" /> : null}
        <section style={scanning ? {...panelStyle, inset: 'auto 12px 18px'} : panelStyle}>
          <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center'}}>
            <h2 style={{fontSize: 18}}>Spike do scanner nativo</h2>
            {!scanning ? (
              <button type="button" onClick={() => void closePanel()} style={{...buttonStyle, background: '#39433f'}}>
                Fechar
              </button>
            ) : null}
          </div>

          <p style={{marginTop: 12, lineHeight: 1.5}}>{messageForPhase(phase)}</p>
          {result ? (
            <div className="phrona-native-scanner-spike-result">
              <div><strong>Código:</strong> {result.code}</div>
              <div><strong>Formato:</strong> {result.format}</div>
            </div>
          ) : null}
          {errorMessage ? <p style={{marginTop: 10, color: '#ffb4ab'}}>Erro: {errorMessage}</p> : null}

          <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16}}>
            {phase === 'needs-permission' ? (
              <button type="button" style={buttonStyle} onClick={() => void requestPermissionAndStart()}>
                Continuar e permitir câmera
              </button>
            ) : null}
            {phase === 'denied' ? (
              <>
                <button type="button" style={buttonStyle} onClick={() => void scanner.openSettings()}>
                  Abrir configurações
                </button>
                <button type="button" style={buttonStyle} onClick={() => void inspectPermission()}>
                  Verificar novamente
                </button>
              </>
            ) : null}
            {!scanning && phase !== 'checking' && phase !== 'needs-permission' && phase !== 'denied' ? (
              <button type="button" style={buttonStyle} onClick={() => void inspectPermission()}>
                Iniciar teste
              </button>
            ) : null}
            {scanning && torchAvailable ? (
              <button type="button" style={buttonStyle} onClick={() => void toggleTorch()}>
                {torchEnabled ? 'Desligar lanterna' : 'Ligar lanterna'}
              </button>
            ) : null}
            {scanning ? (
              <button type="button" style={{...buttonStyle, background: '#8b2f2f'}} onClick={() => void cancelScan()}>
                Cancelar e liberar câmera
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  };
}
