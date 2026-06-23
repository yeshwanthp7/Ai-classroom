import { useEffect, useRef, useState, useCallback } from "react";

export interface FocusMetrics {
  score: number;
  status: "focused" | "distracted" | "away" | "offline";
  gazeDirection: "center" | "left" | "right" | "up" | "down" | "unknown";
  faceDetected: boolean;
  eyesOpen: boolean;
}

interface UseFocusTrackerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onFocusUpdate?: (metrics: FocusMetrics) => void;
  enabled?: boolean;
}

export function useFocusTracker({ videoRef, onFocusUpdate, enabled = true }: UseFocusTrackerOptions) {
  const [metrics, setMetrics] = useState<FocusMetrics>({
    score: 100,
    status: "focused",
    gazeDirection: "unknown",
    faceDetected: false,
    eyesOpen: true,
  });

  const lastUpdateRef = useRef<number>(0);
  const historyRef = useRef<number[]>([]);

  const calculateEAR = useCallback((landmarks: any, leftEye: number[], rightEye: number[]) => {
    const dist = (i1: number, i2: number) => {
      const dx = landmarks[i1].x - landmarks[i2].x;
      const dy = landmarks[i1].y - landmarks[i2].y;
      const dz = landmarks[i1].z - landmarks[i2].z;
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
    };
    const left = (dist(leftEye[1], leftEye[5]) + dist(leftEye[2], leftEye[4])) / (2 * dist(leftEye[0], leftEye[3]));
    const right = (dist(rightEye[1], rightEye[5]) + dist(rightEye[2], rightEye[4])) / (2 * dist(rightEye[0], rightEye[3]));
    return (left + right) / 2;
  }, []);

  const estimateHeadPose = useCallback((landmarks: any) => {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const yaw = (nose.x - eyeCenterX) * 100;
    return { yaw };
  }, []);

  const estimateGaze = useCallback((landmarks: any) => {
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];
    const leftInner = landmarks[133];
    const leftOuter = landmarks[33];
    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];
    const leftGaze = (leftIris.x - leftInner.x) / (leftOuter.x - leftInner.x);
    const rightGaze = (rightIris.x - rightInner.x) / (rightOuter.x - rightInner.x);
    const avg = (leftGaze + rightGaze) / 2;
    if (avg < 0.35) return "left";
    if (avg > 0.65) return "right";
    return "center";
  }, []);

  const computeScore = useCallback((faceDetected: boolean, gaze: string, yaw: number, ear: number, eyesOpen: boolean) => {
    if (!faceDetected) return 0;
    if (!eyesOpen) return 30;
    let score = 100;
    if (gaze !== "center") score -= 40;
    if (Math.abs(yaw) > 15) score -= 25;
    if (Math.abs(yaw) > 30) score -= 35;
    if (ear < 0.18) score -= 30;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, []);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;
    const video = videoRef.current;

    let faceMesh: any;
    let camera: any;

    const initTracker = async () => {
      const faceMeshMod = await import("@mediapipe/face_mesh");
      const cameraUtilsMod = await import("@mediapipe/camera_utils");
      
      const FaceMeshConstructor = faceMeshMod.FaceMesh || (window as any).FaceMesh;
      const CameraConstructor = cameraUtilsMod.Camera || (window as any).Camera;

      faceMesh = new FaceMeshConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
      const now = Date.now();
      if (!results.multiFaceLandmarks?.length) {
        const m: FocusMetrics = { score: 0, status: "away", gazeDirection: "unknown", faceDetected: false, eyesOpen: false };
        setMetrics(m);
        if (onFocusUpdate && now - lastUpdateRef.current > 3000) {
          onFocusUpdate(m);
          lastUpdateRef.current = now;
        }
        return;
      }

      const lm = results.multiFaceLandmarks[0];
      const ear = calculateEAR(lm, [33,160,158,133,153,144], [362,385,387,263,380,373]);
      const eyesOpen = ear > 0.18;
      const head = estimateHeadPose(lm);
      const gaze = estimateGaze(lm);
      const raw = computeScore(true, gaze, head.yaw, ear, eyesOpen);

      historyRef.current.push(raw);
      if (historyRef.current.length > 10) historyRef.current.shift();
      const score = Math.round(historyRef.current.reduce((a,b) => a+b, 0) / historyRef.current.length);

      let status: FocusMetrics["status"] = "focused";
      if (score < 30) status = "away";
      else if (score < 60) status = "distracted";

      const m: FocusMetrics = { score, status, gazeDirection: gaze, faceDetected: true, eyesOpen };

      setMetrics(m);
      if (onFocusUpdate && now - lastUpdateRef.current > 3000) {
        onFocusUpdate(m);
        lastUpdateRef.current = now;
      }
    });

    camera = new CameraConstructor(video, {
      onFrame: async () => { await faceMesh.send({ image: video }); },
      width: 320,
      height: 240,
    });

    camera.start();
    };

    initTracker();

    return () => { 
      if (camera) camera.stop(); 
      if (faceMesh) faceMesh.close(); 
    };
  }, [enabled, videoRef, onFocusUpdate, calculateEAR, estimateHeadPose, estimateGaze, computeScore]);

  return metrics;
}
