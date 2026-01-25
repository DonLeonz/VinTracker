import { useState, useEffect, memo } from 'react';
import { vinService } from '../services/api';

const DatabaseStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const result = await vinService.checkConnection();
      setIsConnected(result.isConnected);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check connection on mount
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`database-status ${isConnected ? 'connected' : 'disconnected'}`}
      data-uk-tooltip={`cls: tooltip-${isConnected ? 'connected' : 'disconnected'}; title: ${isConnected ? '✔ Base de datos conectada y funcionando correctamente' : '⚠ Base de datos desconectada - No se pueden agregar VINs'}; pos: bottom-right`}
    >
      <span className={`status-indicator ${isChecking ? 'checking' : ''}`}>
        <span data-uk-icon={isConnected ? 'icon: database; ratio: 0.9' : 'icon: warning; ratio: 0.9'}></span>
      </span>
      <span className="status-text">
        {isConnected ? 'BD Conectada' : 'BD Desconectada'}
      </span>
    </div>
  );
};

export default memo(DatabaseStatus);
