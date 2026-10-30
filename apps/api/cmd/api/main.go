package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type healthResponse struct {
	Data struct {
		Status string `json:"status"`
	} `json:"data"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := healthResponse{}
		response.Data.Status = "ok"
		if err := json.NewEncoder(w).Encode(response); err != nil {
			log.Printf("encode health response: %v", err)
		}
	})

	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("API listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}
