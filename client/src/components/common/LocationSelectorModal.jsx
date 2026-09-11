import React, { useState, useEffect } from 'react';
import { useLocation } from '../../context/LocationContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
  MapPin,
  Navigation,
  Crosshair,
  AlertCircle,
  CheckCircle2,
  X,
  Sliders,
  RotateCcw
} from 'lucide-react';

const radiusOptions = [
  { value: 1, label: '1 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km (Default)' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' }
];

const LocationSelectorModal = ({ isOpen, onClose }) => {
  const {
    latitude,
    longitude,
    radius,
    isLocating,
    locationError,
    isLocationSet,
    setLocation,
    setRadius,
    clearLocation,
    requestCurrentLocation
  } = useLocation();

  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');
  const [selectedRadius, setSelectedRadius] = useState(radius || 5);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setInputLat(latitude.toString());
      setInputLng(longitude.toString());
    } else {
      setInputLat('');
      setInputLng('');
    }
    setSelectedRadius(radius || 5);
    setFormError('');
    setSuccessMsg('');
  }, [isOpen, latitude, longitude, radius]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = async () => {
    setFormError('');
    setSuccessMsg('');
    const res = await requestCurrentLocation();
    if (res.success) {
      setInputLat(res.latitude.toString());
      setInputLng(res.longitude.toString());
      setSuccessMsg('Location successfully detected!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setFormError(res.message || 'Unable to access your current location.');
    }
  };

  const handleManualSave = (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!inputLat.trim() || !inputLng.trim()) {
      setFormError('Please provide both latitude and longitude coordinates.');
      return;
    }

    const lat = parseFloat(inputLat.trim());
    const lng = parseFloat(inputLng.trim());

    if (isNaN(lat) || isNaN(lng)) {
      setFormError('Coordinates must be valid numbers.');
      return;
    }

    if (lat < -90 || lat > 90) {
      setFormError('Latitude must be between -90 and 90 degrees.');
      return;
    }

    if (lng < -180 || lng > 180) {
      setFormError('Longitude must be between -180 and 180 degrees.');
      return;
    }

    const success = setLocation(lat, lng, `Manual (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
    if (success) {
      setRadius(selectedRadius);
      setSuccessMsg('Location coordinates saved successfully!');
      setTimeout(() => {
        onClose();
      }, 800);
    }
  };

  const handleClear = () => {
    clearLocation();
    setInputLat('');
    setInputLng('');
    setSuccessMsg('Location cleared.');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center border border-emerald-200">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2937]">Choose Your Location</h3>
              <p className="text-[11px] text-[#6B7280]">Discover flash sale deals at stores near you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Status Banners */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {(formError || locationError) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{formError || locationError}</span>
            </div>
          )}

          {/* Quick Action: Use Current Location */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-center space-y-2.5">
            <p className="text-xs text-slate-700 font-medium">
              Find deals near your current physical position:
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={isLocating ? Crosshair : Navigation}
              loading={isLocating}
              onClick={handleUseCurrentLocation}
              className="w-full justify-center shadow-xs"
            >
              {isLocating ? 'Locating...' : 'Use My Current Location'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or enter manually</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Manual Coordinates Form */}
          <form onSubmit={handleManualSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitude"
                placeholder="e.g. 16.5062"
                type="number"
                step="any"
                value={inputLat}
                onChange={(e) => setInputLat(e.target.value)}
                required
              />
              <Input
                label="Longitude"
                placeholder="e.g. 80.6480"
                type="number"
                step="any"
                value={inputLng}
                onChange={(e) => setInputLng(e.target.value)}
                required
              />
            </div>

            {/* Radius Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>Search Radius</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {radiusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedRadius(opt.value);
                      setRadius(opt.value);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                      selectedRadius === opt.value
                        ? 'bg-[#2E7D32] text-white shadow-xs'
                        : 'bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.value} km
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {isLocationSet && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon={RotateCcw}
                  onClick={handleClear}
                  className="text-slate-600"
                >
                  Clear
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="flex-1 justify-center"
              >
                Apply Location
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectorModal;
