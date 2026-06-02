from flask import request, jsonify


def register_middlewares(app):
    @app.before_request
    def attach_request_id():
        # Simple request id header for tracing
        request.request_id = request.headers.get('X-Request-ID') or None

    @app.after_request
    def add_security_headers(resp):
        resp.headers['X-Frame-Options'] = 'DENY'
        resp.headers['X-Content-Type-Options'] = 'nosniff'
        return resp

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api'):
            return jsonify({'error': 'Not found'}), 404
        return e
