### Lessons Learned
- React updates state variables asynchronously, if the value is udpated through UI, then React re-renders state variables but if the set method is used inside a method then it won't update the source valur immediately so, use the React Hook, useRef and useEffect to udpate the value to current value synchronously.
    const [temperature, setTemperature] = useState(0.7);
    const temperatureRef = useRef(temperature);
    const [top_p, setTop_p] = useState(0.8);
    const top_pRef = useRef(top_p);
    useEffect(() => {
        temperatureRef.current = temperature;
        top_pRef.current = top_p;
      }, [temperature, top_p]);
      - Make sure that promise (resolve for 1 second) is used so that values get updated.
- Make sure that we use temperatureRef.current.valueOf() to get the latest value (don't use state variable temperature as React updates them asynchronously)

- Using global variable to access across the app instead of using StateVariable with State Management caused lot of cache issues.
- Using State Management to manage the state of the app is very important.
- React Components are reusable and can be used across the app. VoiceSelect component is used in multiple places.
- Using React Hooks to manage the state of the app is very important.
- Using React Router to navigate between different pages is very important.
- Using React Context to manage the state of the app is very important.
- Using React Portals to render the component in different part of the DOM is very important.
- Using React Refs to access the DOM elements is very important.
- Using React Fragments to group multiple elements is very important.
- Using React Memo to memoize the component is very important.
- Using React Suspense to show the fallback UI is very important.
- Using React Lazy to lazy load the component is very important.
- Using React Error Boundaries to catch the error is very important.
- Using React Testing Library to test the components is very important.
- Using Jest to test the components is very important.
