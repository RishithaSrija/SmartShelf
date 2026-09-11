import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import geoService from '../services/geoService';

const LocationContext = createContext(null);

const SESSION_KEY = 'smartshelf_customer_location';

export const LocationProvider = ({ children }) => {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [radius, setRadiusState] = useState(5); // Default 5 km
  const [permissionState, setPermissionState] = useState('unknown'); // 'unknown' | 'granted' | 'denied'
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);

  // Restore saved session location if user configured it previously in current session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          setLatitude(parsed.latitude);
          setLongitude(parsed.longitude);
          if (parsed.radius) setRadiusState(parsed.radius);
          if (parsed.permissionState) setPermissionState(parsed.permissionState);
          if (parsed.label) setLocationLabel(parsed.label);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved session location', e);
    }
  }, []);

  // Sync to session storage (transient, privacy-preserving)
  const persistSession = (lat, lng, rad, perm, label) => {
    try {
      if (lat !== null && lng !== null) {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            latitude: lat,
            longitude: lng,
            radius: rad,
            permissionState: perm,
            label
          })
        );
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.warn('Failed to store session location', e);
    }
  };

  const setLocation = useCallback(
    (lat, lng, label = 'Custom Location') => {
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);

      if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
        setLocationError('Invalid coordinates provided.');
        return false;
      }

      setLatitude(numLat);
      setLongitude(numLng);
      setLocationLabel(label);
      setLocationError(null);
      persistSession(numLat, numLng, radius, permissionState, label);
      return true;
    },
    [radius, permissionState]
  );

  const setRadius = useCallback(
    (newRadius) => {
      const parsed = Math.min(50, Math.max(0.5, parseFloat(newRadius) || 5));
      setRadiusState(parsed);
      if (latitude !== null && longitude !== null) {
        persistSession(latitude, longitude, parsed, permissionState, locationLabel);
      }
    },
    [latitude, longitude, permissionState, locationLabel]
  );

  const clearLocation = useCallback(() => {
    setLatitude(null);
    setLongitude(null);
    setLocationLabel(null);
    setLocationError(null);
    persistSession(null, null, radius, permissionState, null);
  }, [radius, permissionState]);

  const requestCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const position = await geoService.getCurrentLocation();
      setLatitude(position.latitude);
      setLongitude(position.longitude);
      setPermissionState('granted');
      const label = `Current Location (${position.latitude.toFixed(3)}, ${position.longitude.toFixed(3)})`;
      setLocationLabel(label);
      persistSession(position.latitude, position.longitude, radius, 'granted', label);
      return { success: true, latitude: position.latitude, longitude: position.longitude };
    } catch (err) {
      const errorMsg = err.message || 'Unable to retrieve location.';
      setLocationError(errorMsg);
      if (err.code === 1 || err.code === 'PERMISSION_DENIED') {
        setPermissionState('denied');
      }
      return { success: false, message: errorMsg };
    } finally {
      setIsLocating(false);
    }
  }, [radius]);

  const isLocationSet = latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude);

  return (
    <LocationContext.Provider
      value={{
        latitude,
        longitude,
        radius,
        permissionState,
        isLocating,
        locationError,
        locationLabel,
        isLocationSet,
        setLocation,
        setRadius,
        clearLocation,
        requestCurrentLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;
