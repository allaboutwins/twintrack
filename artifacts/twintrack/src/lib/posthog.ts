import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    autocapture: false,
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug();
    },
  });
}

export { posthog };
