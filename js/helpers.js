rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // --- Community flood reports: public read, validated public write ---
    match /community_reports/{reportId} {
      allow read: if true;

      allow create: if request.resource.data.keys().hasOnly([
                        'location', 'lat', 'lon', 'is_curated', 'verified_place',
                        'severity', 'description', 'reported_at',
                        'confirm_count', 'dispute_count'
                      ])
                    && request.resource.data.location is string
                    && request.resource.data.location.size() > 0
                    && request.resource.data.location.size() < 200
                    && request.resource.data.severity in ['ankle', 'knee', 'waist']
                    && request.resource.data.lat is number
                    && request.resource.data.lon is number
                    && request.resource.data.reported_at == request.time
                    && (!('description' in request.resource.data) || request.resource.data.description is string)
                    && (!('confirm_count' in request.resource.data) || request.resource.data.confirm_count == 0)
                    && (!('dispute_count' in request.resource.data) || request.resource.data.dispute_count == 0);

      // Only the two vote counters may ever change post-creation, one vote at a time.
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['confirm_count', 'dispute_count'])
                    && (
                         (request.resource.data.confirm_count == resource.data.confirm_count + 1
                           && request.resource.data.dispute_count == resource.data.dispute_count)
                      || (request.resource.data.dispute_count == resource.data.dispute_count + 1
                           && request.resource.data.confirm_count == resource.data.confirm_count)
                       );

      allow delete: if false; // your 3-day cleanup runs server-side via the Admin SDK, which bypasses rules entirely
    }

    // --- SOS requests: creation requires anonymous auth; only the creator can resolve their own ---
    match /sos_requests/{sosId} {
      allow read: if true;

      allow create: if request.auth != null
                    && request.resource.data.auth_uid == request.auth.uid
                    && request.resource.data.status == 'active'
                    && request.resource.data.confirm_count == 0
                    && request.resource.data.flag_count == 0
                    && request.resource.data.lat is number
                    && request.resource.data.lon is number
                    && request.resource.data.created_at == request.time;

      allow update: if request.auth != null && (
                        (request.auth.uid == resource.data.auth_uid
                          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
                          && request.resource.data.status == 'resolved')
                     || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['confirm_count'])
                          && request.resource.data.confirm_count == resource.data.confirm_count + 1)
                     || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['flag_count'])
                          && request.resource.data.flag_count == resource.data.flag_count + 1)
                      );

      allow delete: if false;

      match /messages/{messageId} {
        allow read: if true;
        allow create: if request.auth != null
                      && request.resource.data.text is string
                      && request.resource.data.text.size() > 0
                      && request.resource.data.text.size() < 1000
                      && request.resource.data.sent_at == request.time;
        allow update, delete: if false;
      }
    }
  }
}
