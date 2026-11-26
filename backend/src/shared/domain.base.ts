/**
 * Domain objects of the application.
 *
 * @template T The DTO of the domain object.
 * @class
 * @abstract
 */
export abstract class DomainBase<T> {

	protected abstract toDTO(): T | Promise<T>;
}