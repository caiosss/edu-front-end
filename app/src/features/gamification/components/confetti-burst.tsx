import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { confettiPalette } from "../theme";

export type ConfettiShape = "rect" | "circle" | "square" | "streamer";

type ParticleSpec = {
  color: string;
  delay: number;
  drag: number;
  flip: number;
  life: number;
  phase: number;
  shape: ConfettiShape;
  size: number;
  spin: number;
  sway: number;
  swayFrequency: number;
  vx: number;
  vy: number;
};

type ConfettiBurstProps = {
  /** Cada valor novo dispara uma explosao. Zero nao dispara. */
  burstKey: number;
  /** Ponto de origem, relativo ao container pai. */
  origin: { x: number; y: number };
  count?: number;
  colors?: readonly string[];
  /** Direcao central em graus: -90 e para cima, 90 para baixo. */
  direction?: number;
  spread?: number;
  power?: readonly [number, number];
  gravity?: number;
  duration?: number;
  shapes?: readonly ConfettiShape[];
  sizeRange?: readonly [number, number];
};

const DEFAULT_POWER = [320, 620] as const;
const DEFAULT_SIZE_RANGE = [6, 10] as const;
const DEFAULT_SHAPES: readonly ConfettiShape[] = ["rect", "circle", "square", "streamer"];

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const shapeDimensions = (shape: ConfettiShape, size: number) => {
  switch (shape) {
    case "circle":
      return { width: size, height: size, borderRadius: size / 2 };
    case "square":
      return { width: size, height: size, borderRadius: 1.5 };
    case "streamer":
      return { width: size * 0.4, height: size * 2.4, borderRadius: size };
    default:
      return { width: size, height: size * 1.5, borderRadius: 2 };
  }
};

function ConfettiParticle({
  gravity,
  origin,
  progress,
  spec,
  totalDuration,
}: {
  gravity: number;
  origin: { x: number; y: number };
  progress: SharedValue<number>;
  spec: ParticleSpec;
  totalDuration: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const elapsed = progress.value * totalDuration - spec.delay;

    if (elapsed <= 0) {
      return {
        opacity: 0,
        transform: [
          { translateX: 0 },
          { translateY: 0 },
          { rotate: "0deg" },
          { scaleX: 0 },
          { scaleY: 0 },
        ],
      };
    }

    const lifeRatio = Math.min(elapsed / spec.life, 1);
    const t = Math.min(elapsed, spec.life) / 1000;
    // Arrasto do ar: a particula dispara rapido e "flutua" em vez de seguir em linha reta.
    const decay = (1 - Math.exp(-spec.drag * t)) / spec.drag;
    const x = spec.vx * decay + spec.sway * Math.sin(t * spec.swayFrequency + spec.phase);
    const y = spec.vy * decay + 0.5 * gravity * t * t;
    const grow = Math.min(1, 0.35 + lifeRatio * 8);

    return {
      opacity: lifeRatio < 0.72 ? 1 : Math.max(0, 1 - (lifeRatio - 0.72) / 0.28),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${spec.spin * t}deg` },
        // Cosseno no eixo X simula o papel girando em 3D.
        { scaleX: grow * Math.cos(t * spec.flip) },
        { scaleY: grow },
      ],
    };
  });

  const dimensions = shapeDimensions(spec.shape, spec.size);

  return (
    <Animated.View
      style={[
        styles.particle,
        dimensions,
        {
          left: origin.x - dimensions.width / 2,
          top: origin.y - dimensions.height / 2,
          backgroundColor: spec.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function ConfettiBurst({
  burstKey,
  origin,
  count = 28,
  colors = confettiPalette,
  direction = -90,
  spread = 120,
  power = DEFAULT_POWER,
  gravity = 640,
  duration = 1500,
  shapes = DEFAULT_SHAPES,
  sizeRange = DEFAULT_SIZE_RANGE,
}: ConfettiBurstProps) {
  const progress = useSharedValue(0);

  // Regerado apenas quando uma nova explosao e disparada; mudar props no meio do voo nao
  // deve reembaralhar as particulas.
  const specs = useMemo<ParticleSpec[]>(() => {
    if (!burstKey) {
      return [];
    }

    return Array.from({ length: count }, () => {
      const angle = ((direction + (Math.random() - 0.5) * spread) * Math.PI) / 180;
      const speed = randomBetween(power[0], power[1]);

      return {
        color: pick(colors),
        delay: Math.random() * 120,
        drag: randomBetween(1.1, 2),
        flip: randomBetween(4, 11),
        life: duration * randomBetween(0.7, 1),
        phase: Math.random() * Math.PI * 2,
        shape: pick(shapes),
        size: randomBetween(sizeRange[0], sizeRange[1]),
        spin: randomBetween(-540, 540),
        sway: randomBetween(4, 18),
        swayFrequency: randomBetween(3, 7),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
  }, [burstKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDuration = useMemo(
    () => specs.reduce((max, spec) => Math.max(max, spec.delay + spec.life), 0),
    [specs]
  );

  useEffect(() => {
    if (!burstKey || totalDuration <= 0) {
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, { duration: totalDuration, easing: Easing.linear });

    return () => {
      cancelAnimation(progress);
    };
  }, [burstKey, progress, totalDuration]);

  if (specs.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.layer}>
      {specs.map((spec, index) => (
        <ConfettiParticle
          key={`${burstKey}-${index}`}
          gravity={gravity}
          origin={origin}
          progress={progress}
          spec={spec}
          totalDuration={totalDuration}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "visible",
  },
  particle: {
    position: "absolute",
  },
});
