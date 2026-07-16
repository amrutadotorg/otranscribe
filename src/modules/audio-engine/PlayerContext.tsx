/**
 * PlayerContext.tsx — React context for player state
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import {
  Player,
  createPlayer,
  isVideoFormat,
  type PlayerOptions,
} from './Player';
import type { PlayerDriverType, PlayerState } from '../../types/player';
import type { MediaDetails } from '../../types/otr';
import { downloadAndCacheVimeo } from '../storage/vimeoCache';

interface PlayerContextValue {
  playerState: PlayerState;
  mediaDetails: MediaDetails | null;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  skip: (direction: 'forwards' | 'backwards') => void;
  skipTo: (seconds: number) => void;
  speedUp: () => void;
  speedDown: () => void;
  setSpeed: (speed: number) => void;
  loadLocalFile: (file: File) => Promise<void>;
  loadYouTube: (url: string) => Promise<void>;
  loadVimeoFile: (file: File, name: string) => Promise<void>;
  loadVimeoUrl: (
    url: string,
    onProgress?: (loaded: number, total: number) => void,
  ) => Promise<void>;
  unloadPlayer: () => void;
}

const defaultState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  speed: 1,
  isReady: false,
  driverType: null,
  mediaName: '',
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [playerState, setPlayerState] = useState<PlayerState>(defaultState);
  const [mediaDetails, setMediaDetails] = useState<MediaDetails | null>(null);
  const playerRef = useRef<Player | null>(null);

  const updateState = useCallback((updates: Partial<PlayerState>) => {
    setPlayerState((prev) => ({ ...prev, ...updates }));
  }, []);

  const loadDriver = useCallback(
    async (opts: PlayerOptions, details: MediaDetails): Promise<void> => {
      // Destroy existing
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      // Update driverType synchronously BEFORE createPlayer
      // so React renders #media-container into the DOM before
      // the driver tries to appendChild() into it
      flushSync(() => {
        setPlayerState((prev) => ({
          ...prev,
          ...defaultState,
          driverType: opts.driver,
        }));
        setMediaDetails(details);
      });

      const player = await createPlayer({
        ...opts,
        onPlayPause: (status) => {
          updateState({ isPlaying: status === 'playing' });
        },
        onSpeedChange: (speed) => {
          updateState({ speed });
        },
        onTimeUpdate: (time) => {
          setPlayerState((prev) => ({
            ...prev,
            currentTime: time,
            duration: player.getLength(),
          }));
        },
      });

      playerRef.current = player;
      updateState({
        isReady: true,
        duration: player.getLength(),
        speed: player.getSpeed(),
        mediaName: player.getName(),
      });
    },
    [updateState],
  );

  const loadLocalFile = useCallback(
    async (file: File): Promise<void> => {
      const url = URL.createObjectURL(file);
      const driverType: PlayerDriverType = isVideoFormat(file)
        ? 'HTML5_VIDEO'
        : 'HTML5_AUDIO';

      await loadDriver(
        { driver: driverType, source: url, name: file.name },
        { name: file.name },
      );
    },
    [loadDriver],
  );

  const loadYouTube = useCallback(
    async (url: string): Promise<void> => {
      await loadDriver(
        { driver: 'YOUTUBE', source: url },
        { name: url, source: url },
      );
    },
    [loadDriver],
  );

  const loadVimeoFile = useCallback(
    async (file: File, name: string): Promise<void> => {
      const url = URL.createObjectURL(file);
      await loadDriver({ driver: 'HTML5_VIDEO', source: url, name }, { name });
    },
    [loadDriver],
  );

  const loadVimeoUrl = useCallback(
    async (
      url: string,
      onProgress?: (loaded: number, total: number) => void,
    ): Promise<void> => {
      const { file, name } = await downloadAndCacheVimeo(url, onProgress);
      const objectUrl = URL.createObjectURL(file);
      await loadDriver(
        { driver: 'HTML5_VIDEO', source: objectUrl, name },
        { name },
      );
    },
    [loadDriver],
  );

  const play = useCallback(() => playerRef.current?.play(), []);
  const pause = useCallback(() => playerRef.current?.pause(), []);
  const togglePlayPause = useCallback(
    () => playerRef.current?.togglePlayPause(),
    [],
  );
  const skip = useCallback(
    (direction: 'forwards' | 'backwards') => playerRef.current?.skip(direction),
    [],
  );
  const skipTo = useCallback(
    (seconds: number) => playerRef.current?.setTime(seconds),
    [],
  );
  const speedUp = useCallback(() => playerRef.current?.speedUp(), []);
  const speedDown = useCallback(() => playerRef.current?.speedDown(), []);
  const setSpeed = useCallback(
    (speed: number) => playerRef.current?.setSpeed(speed),
    [],
  );

  const unloadPlayer = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    setPlayerState(defaultState);
    setMediaDetails(null);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        playerState,
        mediaDetails,
        play,
        pause,
        togglePlayPause,
        skip,
        skipTo,
        speedUp,
        speedDown,
        setSpeed,
        loadLocalFile,
        loadYouTube,
        loadVimeoFile,
        loadVimeoUrl,
        unloadPlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}
