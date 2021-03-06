module.exports = function (req, res) {
	var keystone = req.keystone;
	if (!keystone.security.csrf.validate(req)) {
		return res.apiError(403, 'invalid csrf');
	}
	req.list.model.findById(req.params.id, function (err, item) {
		if (!req.list.canEditItem(req.user, item)) {
			return res.apiError(403, 'Access denied');
		}
		if (req.list.admin && !req.user.isAdmin && (item.id != req.user.id || req.body.isAdmin == 'true')) {
			return res.apiError(403, 'Access denied');
		}
		if (!req.user.isAdmin) {
			req.list.restrictedProperties.forEach(function(prop) {
				delete req.body[prop]
			});
		}

		if (err) return res.status(500).json({ error: 'database error', detail: err });
		if (!item) return res.status(404).json({ error: 'not found', id: req.params.id });
		req.list.updateItem(item, req.body, { files: req.files, user: req.user }, function (err) {
			if (err) {
				var status = err.error === 'validation errors' ? 400 : 500;
				var error = err.error === 'database error' ? err.detail : err;
				return res.apiError(status, error);
			}
			// Reload the item from the database to prevent save hooks or other
			// application specific logic from messing with the values in the item
			req.list.model.findById(req.params.id, function (err, updatedItem) {
				res.json(req.list.getData(updatedItem));
			});
		});
	});
};
