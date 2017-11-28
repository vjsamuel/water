package common

import (
	"math"

	"cloud.google.com/go/datastore"
)

func Distance(src datastore.GeoPoint, dest datastore.GeoPoint) float64 {
	// convert to radians
	// must cast radius as float to multiply later
	var la1, lo1, la2, lo2, r float64
	la1 = src.Lat * math.Pi / 180
	lo1 = src.Lng * math.Pi / 180
	la2 = dest.Lat * math.Pi / 180
	lo2 = dest.Lng * math.Pi / 180

	r = 6378100 // Earth radius in METERS

	// calculate
	h := hsin(la2-la1) + math.Cos(la1)*math.Cos(la2)*hsin(lo2-lo1)

	return 2 * r * math.Asin(math.Sqrt(h))
}

func hsin(theta float64) float64 {
	return math.Pow(math.Sin(theta/2), 2)
}
