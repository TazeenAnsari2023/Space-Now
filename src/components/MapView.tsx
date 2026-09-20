import L from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Space } from "../types/space";
import { getMarkerIcon } from "../utils/getMarkerIcon";
import { useEffect } from "react";
import "leaflet.markercluster";

interface MapViewProps {
  lat: number;
  lng: number;
  spaces: Space[];
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 0.8 });
  }, [lat, lng, map]);

  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ClusteredMarkers({ spaces }: { spaces: Space[] }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = (L as any).markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      removeOutsideVisibleBounds: true,
      disableClusteringAtZoom: 16
    });

    spaces.forEach((space) => {
      const marker = L.marker(
        [space.location.coordinates[1], space.location.coordinates[0]],
        { icon: getMarkerIcon(space) }
      );

      const safeName = escapeHtml(space.name);
      const safeCity = escapeHtml(space.city || "");
      const safeState = escapeHtml(space.state || "");

      marker.bindPopup(
        `<div style="min-width:220px">
          <h4 style="margin:0 0 6px 0">${safeName}</h4>
          <p style="margin:0 0 6px 0">Rs ${space.pricePerMonth}/month</p>
          <p style="margin:0 0 10px 0">${safeCity}${safeCity && safeState ? ", " : ""}${safeState}</p>
          <a href="/space/${space._id}" style="font-weight:600">View details</a>
        </div>`
      );

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
      clusterGroup.clearLayers();
    };
  }, [map, spaces]);

  return null;
}

function MapView({ lat, lng, spaces }: MapViewProps) {
  const center: LatLngExpression = [lat, lng];

  return (
    <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
      <RecenterMap lat={lat} lng={lng} />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />

      <CircleMarker
        center={[lat, lng]}
        radius={10}
        pathOptions={{ color: "#0369a1", fillColor: "#38bdf8", fillOpacity: 0.9 }}
      >
        <Popup>Your pinned current location</Popup>
      </CircleMarker>

      <ClusteredMarkers spaces={spaces} />
    </MapContainer>
  );
}

export default MapView;
