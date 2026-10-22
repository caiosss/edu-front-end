import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";

/** Folga entre o campo e o topo do teclado, para o rotulo de erro tambem aparecer. */
const FIELD_CLEARANCE = 96;

const ScrollToFocusedInputContext = createContext<(() => void) | null>(null);

/**
 * Para os campos de texto: chame no `onFocus`. Trocar de campo com o teclado ja aberto nao
 * dispara evento de teclado, entao e o campo que avisa que precisa aparecer.
 */
export function useScrollToFocusedInput(): () => void {
  return useContext(ScrollToFocusedInputContext) ?? noop;
}

const noop = () => undefined;

/**
 * No navegador quem rola ate o campo focado e o proprio Safari, e o react-native-web nao tem
 * `TextInput.State.currentlyFocusedInput` (chamar estourava a cada toque num campo).
 */
const IS_WEB = Platform.OS === "web";

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  children: ReactNode;
};

/**
 * ScrollView que acompanha o teclado.
 *
 * O app e edge-to-edge no Android (`edgeToEdgeEnabled`): a janela nao encolhe quando o teclado
 * abre, e o `KeyboardAvoidingView` sem `behavior` nao fazia nada, deixando o campo focado
 * escondido. Aqui o conteudo ganha um espaco embaixo do tamanho da parte da tela coberta pelo
 * teclado e o campo focado rola para cima dele. Funciona igual no iPhone e tambem quando o
 * sistema encolhe a janela (o espaco extra fica zero).
 */
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
  keyboardShouldPersistTaps = "handled",
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const scrollToFocusedInput = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;
    const input = TextInput.State.currentlyFocusedInput();
    const scrollView = scrollRef.current;

    if (keyboardTop === null || !input || !scrollView) {
      return;
    }

    input.measureInWindow((_x, y, _width, height) => {
      const overflow = y + height + FIELD_CLEARANCE - keyboardTop;

      if (overflow > 0) {
        scrollView.scrollTo({ y: scrollYRef.current + overflow, animated: true });
      }
    });
  }, []);

  /** Espera o espaco extra ser desenhado antes de rolar, senao nao ha para onde rolar. */
  const scheduleScrollToFocusedInput = useCallback(() => {
    setTimeout(scrollToFocusedInput, 80);
  }, [scrollToFocusedInput]);

  useEffect(() => {
    const handleShow = (event: KeyboardEvent) => {
      const { height, screenY } = event.endCoordinates;
      // Em alguns Android o `screenY` vem deslocado pela barra de status; o menor dos dois
      // valores nunca deixa o campo atras do teclado.
      const keyboardTop = Math.min(screenY, Dimensions.get("window").height - height);
      keyboardTopRef.current = keyboardTop;

      scrollRef.current?.getNativeScrollRef()?.measureInWindow((_x, y, _width, viewHeight) => {
        setKeyboardInset(Math.max(0, y + viewHeight - keyboardTop));
        scheduleScrollToFocusedInput();
      });
    };

    const handleHide = () => {
      keyboardTopRef.current = null;
      setKeyboardInset(0);
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      handleShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      handleHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scheduleScrollToFocusedInput]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll]
  );

  const basePaddingBottom = useMemo(() => {
    const paddingBottom = StyleSheet.flatten(contentContainerStyle)?.paddingBottom;
    return typeof paddingBottom === "number" ? paddingBottom : 0;
  }, [contentContainerStyle]);

  return (
    <ScrollToFocusedInputContext.Provider value={IS_WEB ? noop : scheduleScrollToFocusedInput}>
      <ScrollView
        {...props}
        ref={scrollRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        contentContainerStyle={[
          contentContainerStyle,
          { paddingBottom: basePaddingBottom + keyboardInset },
        ]}
      >
        {children}
      </ScrollView>
    </ScrollToFocusedInputContext.Provider>
  );
}
